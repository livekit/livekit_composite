package transport

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"sync"

	sipgo "github.com/emiago/sipgo/sip"

	"github.com/livekit/sipgo/sip"
)

// TCP transport implementation
type TCPTransport struct {
	addr      string
	transport string
	parser    *sipgo.Parser
	log       *slog.Logger

	pool *ConnectionPool
}

func NewTCPTransport(par *sipgo.Parser) *TCPTransport {
	p := &TCPTransport{
		parser:    par,
		pool:      NewConnectionPool(),
		transport: TransportTCP,
	}
	p.log = slog.With("caller", "transport<TCP>")
	return p
}

func (t *TCPTransport) String() string {
	return "transport<TCP>"
}

func (t *TCPTransport) Network() string {
	// return "tcp"
	return t.transport
}

func (t *TCPTransport) Close() error {
	// return t.connections.Done()
	t.pool.Clear()
	return nil
}

// Serve is direct way to provide conn on which this worker will listen
func (t *TCPTransport) Serve(l net.Listener, handler sip.MessageHandler) error {
	t.log.Debug("begin listening on", "net", t.Network(), "addr", l.Addr())
	for {
		conn, err := l.Accept()
		if err != nil {
			t.log.Debug("Fail to accept conenction", "err", err)
			return err
		}

		t.initConnection(conn, conn.RemoteAddr().String(), handler)
	}
}

func (t *TCPTransport) ResolveAddr(addr string) (net.Addr, error) {
	return net.ResolveTCPAddr("tcp", addr)
}

func (t *TCPTransport) GetConnection(addr string) (Connection, error) {
	raddr, err := net.ResolveTCPAddr("tcp", addr)
	if err != nil {
		return nil, err
	}
	addr = raddr.String()

	t.log.Debug("Getting connection", "addr", addr)

	c := t.pool.Get(addr)
	return c, nil
}

func (t *TCPTransport) CreateConnection(laddr Addr, host string, raddr Addr, handler sip.MessageHandler) (Connection, error) {
	// We are letting transport layer to resolve our address
	// raddr, err := net.ResolveTCPAddr("tcp", addr)
	// if err != nil {
	// 	return nil, err
	// }

	traddr := &net.TCPAddr{
		IP:   raddr.IP,
		Port: raddr.Port,
	}
	return t.createConnection(nil, traddr, handler)
}

func (t *TCPTransport) createConnection(laddr *net.TCPAddr, raddr *net.TCPAddr, handler sip.MessageHandler) (Connection, error) {
	addr := raddr.String()
	t.log.Debug("Dialing new connection", "raddr", addr)

	conn, err := net.DialTCP("tcp", laddr, raddr)
	if err != nil {
		return nil, fmt.Errorf("%s dial err=%w", t, err)
	}

	// if err := conn.SetKeepAlive(true); err != nil {
	// 	return nil, fmt.Errorf("%s keepalive err=%w", t, err)
	// }

	// if err := conn.SetKeepAlivePeriod(30 * time.Second); err != nil {
	// 	return nil, fmt.Errorf("%s keepalive period err=%w", t, err)
	// }

	c := t.initConnection(conn, addr, handler)
	return c, nil
}

func (t *TCPTransport) initConnection(conn net.Conn, addr string, handler sip.MessageHandler) Connection {
	// // conn.SetKeepAlive(true)
	// conn.SetKeepAlivePeriod(3 * time.Second)

	t.log.Debug("New connection", "raddr", addr)
	c := &TCPConnection{
		Conn:     conn,
		refcount: 1 + IdleConnection,
	}
	t.pool.Add(addr, c)
	go t.readConnection(c, addr, handler)
	return c
}

// This should performe better to avoid any interface allocation
func (t *TCPTransport) readConnection(conn *TCPConnection, raddr string, handler sip.MessageHandler) {
	buf := make([]byte, transportBufferSize)

	defer t.pool.CloseAndDelete(conn, raddr)

	// Create stream parser context
	par := t.parser.NewSIPStream()

	for {
		num, err := conn.Read(buf)
		if err != nil {
			if errors.Is(err, net.ErrClosed) || errors.Is(err, io.EOF) {
				t.log.Debug("connection was closed", "err", err)
				return
			}

			t.log.Error("Read error", "err", err)
			return
		}

		data := buf[:num]
		if len(bytes.Trim(data, "\x00")) == 0 {
			continue
		}

		// Check is keep alive
		if len(data) <= 4 {
			//One or 2 CRLF
			if len(bytes.Trim(data, "\r\n")) == 0 {
				t.log.Debug("Keep alive CRLF received")
				continue
			}
		}

		// TODO fallback to parseFull if message size limit is set

		// t.log.Debug().Str("raddr", raddr).Str("data", string(data)).Msg("new message")
		t.parseStream(par, data, raddr, handler)
	}
}

func (t *TCPTransport) parseStream(par *sipgo.ParserStream, data []byte, src string, handler sip.MessageHandler) {
	bytesPacketSize.WithLabelValues("tcp", "read").Observe(float64(len(data)))
	msgs, err := par.ParseSIPStream(data)
	if err == sipgo.ErrParseSipPartial {
		return
	}
	if err != nil {
		t.log.Error("failed to parse", "err", err, "data", string(data))
		return
	}

	for _, msg := range msgs {
		msg.SetTransport(t.Network())
		msg.SetSource(src)
		handler(msg)
	}
}

// TODO use this when message size limit is defined
func (t *TCPTransport) parseFull(data []byte, src string, handler sip.MessageHandler) {
	msg, err := t.parser.ParseSIP(data) //Very expensive operation
	if err != nil {
		t.log.Error("failed to parse", "err", err, "data", string(data))
		return
	}

	msg.SetTransport(t.Network())
	msg.SetSource(src)
	handler(msg)
}

type TCPConnection struct {
	net.Conn

	mu       sync.RWMutex
	refcount int
}

func (c *TCPConnection) Ref(i int) int {
	c.mu.Lock()
	c.refcount += i
	ref := c.refcount
	c.mu.Unlock()
	slog.Debug("TCP reference increment", "ip", c.LocalAddr(), "dst", c.RemoteAddr(), "ref", ref)
	return ref
}

func (c *TCPConnection) Close() error {
	c.mu.Lock()
	c.refcount = 0
	c.mu.Unlock()
	slog.Debug("TCP doing hard close", "ip", c.LocalAddr(), "dst", c.RemoteAddr(), "ref", 0)
	return c.Conn.Close()
}

func (c *TCPConnection) TryClose() (int, error) {
	c.mu.Lock()
	c.refcount--
	ref := c.refcount
	c.mu.Unlock()
	slog.Debug("TCP reference decrement", "ip", c.LocalAddr(), "dst", c.RemoteAddr().String(), "ref", ref)
	if ref > 0 {
		return ref, nil
	}

	if ref < 0 {
		slog.Warn("TCP ref went negative", "ip", c.LocalAddr(), "dst", c.RemoteAddr(), "ref", ref)
		return 0, nil
	}

	slog.Debug("TCP closing", "ip", c.LocalAddr(), "dst", c.RemoteAddr(), "ref", ref)
	return ref, c.Conn.Close()
}

func (c *TCPConnection) Read(b []byte) (n int, err error) {
	// Some debug hook. TODO move to proper way
	n, err = c.Conn.Read(b)
	if SIPDebug {
		slog.Debug("TCP read", "local", c.Conn.LocalAddr(), "remote", c.Conn.RemoteAddr(), "data", string(b[:n]))
	}
	return n, err
}

func (c *TCPConnection) Write(b []byte) (n int, err error) {
	// Some debug hook. TODO move to proper way
	n, err = c.Conn.Write(b)
	if SIPDebug {
		slog.Debug("TCP write", "local", c.Conn.LocalAddr(), "remote", c.Conn.RemoteAddr(), "data", string(b[:n]))
	}
	return n, err
}

func (c *TCPConnection) WriteMsg(msg sip.Message) error {
	buf := bufPool.Get().(*bytes.Buffer)
	defer bufPool.Put(buf)
	buf.Reset()
	msg.StringWrite(buf)
	data := buf.Bytes()

	bytesPacketSize.WithLabelValues("tcp", "write").Observe(float64(len(data)))

	n, err := c.Write(data)
	if err != nil {
		return fmt.Errorf("conn %s write err=%w", c.RemoteAddr().String(), err)
	}

	if n == 0 {
		return fmt.Errorf("wrote 0 bytes")
	}

	if n != len(data) {
		return fmt.Errorf("fail to write full message")
	}
	return nil
}
