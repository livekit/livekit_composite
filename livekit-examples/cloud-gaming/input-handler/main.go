package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/real-danm/uinput"

	lksdk "github.com/livekit/server-sdk-go"
)

type EventData struct {
	Type        string     `json:"type"`
	Key         string     `json:"key,omitempty"`
	Position    *Position  `json:"position,omitempty"`
	Button      string     `json:"button,omitempty"`
	Shift       bool       `json:"shift,omitempty"`
	Control     bool       `json:"control,omitempty"`
	ButtonIndex int        `json:"buttonIndex,omitempty"`
	LeftStick   *[]float64 `json:"leftAxes,omitempty"`
	RightStick  *[]float64 `json:"rightAxes,omitempty"`
	DeltaX      int        `json:"deltaX,omitempty"`
	DeltaY      int        `json:"deltaY,omitempty"`
}

type Position struct {
	X int `json:"x"`
	Y int `json:"y"`
}

const (
	livekitURL      = os.Getenv("LK_ENDPOINT")
	roomName        = os.Getenv("LK_ROOM")
	apiKey          = os.Getenv("LK_API_KEY")
	apiSecret       = os.Getenv("LK_SECRET_KEY")
	participantName = "input-listener"
)

var keyMap = map[string]int{
	"a":         uinput.KeyA,
	"b":         uinput.KeyB,
	"c":         uinput.KeyC,
	"d":         uinput.KeyD,
	"e":         uinput.KeyE,
	"f":         uinput.KeyF,
	"g":         uinput.KeyG,
	"h":         uinput.KeyH,
	"i":         uinput.KeyI,
	"j":         uinput.KeyJ,
	"k":         uinput.KeyK,
	"l":         uinput.KeyL,
	"m":         uinput.KeyM,
	"n":         uinput.KeyN,
	"o":         uinput.KeyO,
	"p":         uinput.KeyP,
	"q":         uinput.KeyQ,
	"r":         uinput.KeyR,
	"s":         uinput.KeyS,
	"t":         uinput.KeyT,
	"u":         uinput.KeyU,
	"v":         uinput.KeyV,
	"w":         uinput.KeyW,
	"x":         uinput.KeyX,
	"y":         uinput.KeyY,
	"z":         uinput.KeyZ,
	"0":         uinput.Key0,
	"1":         uinput.Key1,
	"2":         uinput.Key2,
	"3":         uinput.Key3,
	"4":         uinput.Key4,
	"5":         uinput.Key5,
	"6":         uinput.Key6,
	"7":         uinput.Key7,
	"8":         uinput.Key8,
	"9":         uinput.Key9,
	" ":         uinput.KeySpace,
	".":         uinput.KeyDot,
	",":         uinput.KeyComma,
	"/":         uinput.KeySlash,
	"\\":        uinput.KeyBackslash,
	"-":         uinput.KeyMinus,
	"=":         uinput.KeyEqual,
	"[":         uinput.KeyLeftbrace,
	"]":         uinput.KeyRightbrace,
	";":         uinput.KeySemicolon,
	"'":         uinput.KeyApostrophe,
	"`":         uinput.KeyGrave,
	"enter":     uinput.KeyEnter,
	"backspace": uinput.KeyBackspace,
	"tab":       uinput.KeyTab,
	"esc":       uinput.KeyEsc,
	"escape":    uinput.KeyEsc,
}

var buttonMap = []int{
	uinput.ButtonSouth,
	uinput.ButtonWest,
	uinput.ButtonEast,
	uinput.ButtonNorth,
	uinput.ButtonBumperLeft,
	uinput.ButtonBumperRight,
	uinput.ButtonTriggerLeft,
	uinput.ButtonTriggerRight,
	0, // Share button
	0, // Option button
	uinput.ButtonThumbLeft,
	uinput.ButtonThumbRight,
	uinput.ButtonDpadUp,
	uinput.ButtonDpadDown,
	uinput.ButtonDpadLeft,
	uinput.ButtonDpadRight,
	uinput.ButtonMode,
	0, // Touchpad button (unused)
}

/*
var (
	lastX = 400
	lastY = 400
)
*/

func main() {
	// Create input devices
	device, err := uinput.CreateKeyboard("/dev/uinput", []byte("keyboard0"))
	if err != nil {
		log.Fatalf("Could not create uinput device: %v", err)
		return
	}
	defer device.Close()
	mouse, err := uinput.CreateMouse("/dev/uinput", []byte("mouse0"))
	if err != nil {
		fmt.Println("Error creating mouse:", err)
		return
	}
	defer mouse.Close()

	gamepad, err := uinput.CreateGamepad("/dev/uinput", []byte("gamepad0"), 0xDEAD, 0xBEEF)
	if err != nil {
		fmt.Println("Error creating gamepad:", err)
		return
	}
	defer gamepad.Close()
	// end input devices

	roomCB := &lksdk.RoomCallback{
		ParticipantCallback: lksdk.ParticipantCallback{
			OnDataReceived: func(data []byte, rp *lksdk.RemoteParticipant) {
				var event EventData
				if err := json.Unmarshal(data, &event); err != nil {
					log.Printf("Error unmarshalling data: %v", err)
					return
				}

				if rp == nil {
					fmt.Println("got nil participant, ignoring")
					return
				}
				// check participant name to send input to correct device
				if rp.Name() == "player1" {
					// no op
				} else if rp.Name() == "player2" {
					if event.Type == "keydown" || event.Type == "keyup" || event.Type == "mousemove" || event.Type == "mousewheel" {
						fmt.Println("Ignoring player2 non-gamepad input")
					}
				} else {
					fmt.Println("Ignoring Unknown participant:", rp.Name())
					return
				}

				switch event.Type {
				case "keydown":
					// Handle keydown events
					handleKeyDown(event, device, mouse)
				case "keyup":
					// Handle keyup events
					handleKeyUp(event, device, mouse)
				case "mousemove":
					// Handle mousemove events
					handleMouseMoveNew(event.Position, mouse)
				case "mousedown":
					// Handle mousedown events
					handleMouseClick(event.Button, mouse)
				case "mousewheel":
					// Handle mousewheel events
					mouse.Wheel(false, int32(event.DeltaY))
				case "gamepadButtonUp":
					if event.ButtonIndex == 7 {
						//gamepad.ButtonUp(0x139)
						gamepad.RightTriggerForce(0.0)
					} else if event.ButtonIndex == 6 {
						//gamepad.ButtonUp(0x138)
						gamepad.LeftTriggerForce(0.0)
					} else {
						gamepad.ButtonUp(buttonMap[event.ButtonIndex])
					}
				case "gamepadButtonDown":
					if event.ButtonIndex == 7 {
						//gamepad.ButtonDown(0x139)
						gamepad.RightTriggerForce(1.0)
					} else if event.ButtonIndex == 6 {
						//gamepad.ButtonDown(0x138)
						gamepad.LeftTriggerForce(1.0)
					} else {
						gamepad.ButtonDown(buttonMap[event.ButtonIndex])
					}
				case "gamepadAxes":
					// Handle gamepad axis events
					left := *event.LeftStick
					right := *event.RightStick
					gamepad.LeftStickMove(float32(left[0]), float32(left[1]))
					gamepad.RightStickMove(float32(right[0]), float32(right[1]))
				}
			},
		},
	}

	room, err := lksdk.ConnectToRoom(livekitURL, lksdk.ConnectInfo{
		APIKey:              apiKey,
		APISecret:           apiSecret,
		RoomName:            roomName,
		ParticipantIdentity: participantName,
	}, roomCB)

	if err != nil {
		log.Fatalf("could not create client: %v", err)
	}

	fmt.Println("Connected to room", room.Name())

	select {} // Keep the application running
}

func handleKeyUp(event EventData, device uinput.Keyboard, mouse uinput.Mouse) {
	if event.Key == "Meta" { // @todo why?
		return
	}

	if event.Key == "q" {
		return
	}

	if event.Key == "_" {
		event.Shift = true
		event.Key = "-"
	}

	if event.Key == "~" {
		event.Shift = true
		event.Key = "`"
	}

	keyCode := getKeyCodeFromKeyString(event.Key)
	// Emit key event
	if err := device.KeyUp(keyCode); err != nil {
		log.Printf("Error emitting keydown: %v", err)
		return
	}

	if event.Shift {
		if err := device.KeyUp(uinput.KeyLeftshift); err != nil {
			log.Printf("Error emitting keyup: %v", err)
			return
		}
	}

	if event.Control {
		if err := device.KeyUp(uinput.KeyLeftctrl); err != nil {
			log.Printf("Error emitting keyup: %v", err)
			return
		}
	}
}

func handleKeyDown(event EventData, device uinput.Keyboard, mouse uinput.Mouse) {
	if event.Key == "_" {
		event.Shift = true
		event.Key = "-"
	}

	if event.Key == "~" {
		event.Shift = true
		event.Key = "`"
	}

	if event.Key == "@" {
		event.Shift = true
		event.Key = "2"
	}

	if event.Shift {
		if err := device.KeyDown(uinput.KeyLeftshift); err != nil {
			log.Printf("Error emitting keydown: %v", err)
			return
		}
	}

	if event.Control {
		if err := device.KeyDown(uinput.KeyLeftctrl); err != nil {
			log.Printf("Error emitting keydown: %v", err)
			return
		}
	}

	keyCode := getKeyCodeFromKeyString(event.Key)
	// Emit key event
	if err := device.KeyDown(keyCode); err != nil {
		log.Printf("Error emitting keydown: %v", err)
		return
	}

	/*
		// Emit key event
		if err := device.KeyUp(keyCode); err != nil {
			log.Printf("Error emitting keyup: %v", err)
			return
		}

		if event.Shift {
			if err := device.KeyUp(uinput.KeyLeftshift); err != nil {
				log.Printf("Error emitting keyup: %v", err)
				return
			}
		}

		if event.Control {
			if err := device.KeyUp(uinput.KeyLeftctrl); err != nil {
				log.Printf("Error emitting keyup: %v", err)
				return
			}
		}
	*/
}

func handleMouseMoveNew(position *Position, mouse uinput.Mouse) {
	deltaX := position.X
	deltaY := position.Y

	var err error
	if deltaX > 0 {
		err = mouse.MoveRight(int32(deltaX))
	} else if deltaX < 0 {
		err = mouse.MoveLeft(int32(-deltaX)) // Negate to ensure a positive value
	}

	if err != nil {
		fmt.Println("Error moving mouse:", err)
	}

	if deltaY > 0 {
		err = mouse.MoveDown(int32(deltaY))
	} else if deltaY < 0 {
		err = mouse.MoveUp(int32(-deltaY)) // Negate to ensure a positive value
	}

	if err != nil {
		fmt.Println("Error moving mouse:", err)
	}
}

/*
func handleMouseMove(position *Position, mouse uinput.Mouse) {
	x := position.X
	y := position.Y

	deltaX := x - lastX
	deltaY := y - lastY

	var err error
	if deltaX > 0 {
		err = mouse.MoveRight(int32(deltaX))
	} else if deltaX < 0 {
		err = mouse.MoveLeft(int32(-deltaX)) // Negate to ensure a positive value
	}

	if err != nil {
		fmt.Println("Error moving mouse:", err)
	}

	if deltaY > 0 {
		err = mouse.MoveDown(int32(deltaY))
	} else if deltaY < 0 {
		err = mouse.MoveUp(int32(-deltaY)) // Negate to ensure a positive value
	}

	if err != nil {
		fmt.Println("Error moving mouse:", err)
	}

	lastX = x
	lastY = y
}
*/

func handleMouseClick(button string, mouse uinput.Mouse) {
	switch button {
	case "left":
		err := mouse.LeftClick()
		if err != nil {
			fmt.Println("Error clicking left mouse button:", err)
		}
	case "right":
		mouse.RightClick()
	case "middle":
		mouse.MiddleClick()
	default:
		fmt.Println("Unhandled mouse button:", button)
	}
}

func getKeyCodeFromKeyString(key string) int {
	fmt.Println("Key:", key)
	// lowercase it
	key = strings.ToLower(key)
	if keyCode, exists := keyMap[key]; exists {
		return keyCode
	}
	return -1
}
