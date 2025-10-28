import { Button } from "@/components/ui/button";
import { ProjectPageHeader } from "@/components/custom/project-page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { mockSessions } from "@/lib/mock-data";

export default function DemoPage() {
  return (
    <div className="h-screen w-full flex flex-col bg-bg0">
      {/* Sticky Header with Scroll Animation */}
      <ProjectPageHeader
        crumbs={[
          { label: "Meet", href: "/" },
          { label: "Sessions", href: "#" },
          { label: "RM_Zyz2LvfR5NX9", href: "#", kind: "id" },
          { label: "Participants", href: "#" },
          { label: "PA_wuCGHTWfiwQh", kind: "id" },
        ]}
      >
        <Button variant="outline" size="sm">
          ↻
        </Button>
        <Button variant="outline" size="sm">
          10 min ▼
        </Button>
      </ProjectPageHeader>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto" data-scroll-container>
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div className="bg-bg1 border border-separator1 rounded-md p-6">
            <p className="text-fg2 text-sm mb-4">
              👆 <strong>Scroll down</strong> to see the header animation in action!
              The page title will smoothly collapse and the last breadcrumb will appear in the trail.
            </p>
            <p className="text-fg3 text-xs">
              This matches the production behavior with Framer Motion scroll-linked animations.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-fg0">Participant Details</h2>
            <p className="text-fg2 text-sm mt-1">
              View detailed information about this participant
            </p>
          </div>

          <div className="bg-bg1 border border-separator1 rounded-md p-6">
            <h3 className="text-base font-semibold mb-4">Participant Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-fg3">Participant ID</p>
                <p className="text-sm font-mono text-fg1">PA_wuCGHTWfiwQh</p>
              </div>
              <div>
                <p className="text-sm text-fg3">Session ID</p>
                <p className="text-sm font-mono text-fg1">RM_Zyz2LvfR5NX9</p>
              </div>
              <div>
                <p className="text-sm text-fg3">Join Time</p>
                <p className="text-sm text-fg1">Oct 3, 2025, 3:48:53 pm</p>
              </div>
              <div>
                <p className="text-sm text-fg3">Status</p>
                <Badge variant="outline" className="text-xs">
                  CONNECTED
                </Badge>
              </div>
            </div>
          </div>

          <div className="bg-bg1 border border-separator1 rounded-md">
            <div className="p-6 border-b border-separator1">
              <h3 className="text-base font-semibold">Session History</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session ID</TableHead>
                  <TableHead>Room name</TableHead>
                  <TableHead>Started at</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockSessions.map((session) => (
                  <TableRow key={session.sessionId}>
                    <TableCell className="font-mono text-xs">
                      {session.sessionId}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {session.roomName}
                    </TableCell>
                    <TableCell>{session.startedAt}</TableCell>
                    <TableCell>{session.duration}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {session.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Additional content sections to enable scrolling */}
          <div className="bg-bg1 border border-separator1 rounded-md p-6">
            <h3 className="text-base font-semibold mb-4">Media Tracks</h3>
            <div className="space-y-3">
              {[
                { type: "Audio", codec: "Opus", bitrate: "64 kbps" },
                { type: "Video", codec: "VP8", bitrate: "2.5 Mbps" },
                { type: "Screen Share", codec: "VP8", bitrate: "1.2 Mbps" },
              ].map((track, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-bg0 rounded border border-separator1">
                  <div>
                    <p className="text-sm font-medium text-fg1">{track.type}</p>
                    <p className="text-xs text-fg3">{track.codec}</p>
                  </div>
                  <p className="text-sm text-fg2">{track.bitrate}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-bg1 border border-separator1 rounded-md p-6">
            <h3 className="text-base font-semibold mb-4">Connection Quality</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-fg2">Latency</span>
                  <span className="text-fg1 font-medium">32ms</span>
                </div>
                <div className="w-full bg-bg0 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-fg2">Packet Loss</span>
                  <span className="text-fg1 font-medium">0.2%</span>
                </div>
                <div className="w-full bg-bg0 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '98%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-fg2">Jitter</span>
                  <span className="text-fg1 font-medium">5ms</span>
                </div>
                <div className="w-full bg-bg0 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '90%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Spacer for more scrolling */}
          <div className="h-64 bg-bg1 border border-separator1 rounded-md p-6 flex items-center justify-center">
            <p className="text-fg3 text-sm">
              Keep scrolling to see the header fully collapse ✨
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

