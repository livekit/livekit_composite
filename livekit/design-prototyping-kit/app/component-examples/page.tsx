'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { mockSessions } from "@/lib/mock-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbId,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { ProjectPageHeader } from "@/components/custom/project-page-header";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";

export default function ComponentExamples() {
  // State for interactive checkboxes
  const [checkbox1, setCheckbox1] = useState(true);
  const [checkbox2, setCheckbox2] = useState(false);
  const [checkbox3] = useState(true);
  const [checkbox4] = useState(false);
  
  // State for select
  const [selectValue, setSelectValue] = useState<string>("");
  return (
    <div className="h-screen w-full flex flex-col bg-bg0">
      {/* Sticky Header */}
      <ProjectPageHeader
        crumbs={[
          { label: "Prototyping Starter", href: "/" },
          { label: "Components", href: "/" },
          { label: "Library" },
        ]}
      >
        <Link href="/">
          <Button variant="outline" size="sm">
            Home
          </Button>
        </Link>
      </ProjectPageHeader>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto" data-scroll-container>
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-2">
            <p className="text-fg2 text-sm">
              Core components used to build and iterate on prototypes faster. See
              the Bites & Bytes repo for production components.
            </p>
          </div>

          {/* Button section */}
          <div className="flex flex-col gap-4 w-full">
        <h2 className="text-lg font-bold">Button</h2>
        <Separator />
        <div className="flex flex-row gap-2">
          <Button variant="primary">Primary button</Button>
          <Button variant="secondary">Secondary button</Button>
          <Button variant="outline">Outline button</Button>
          <Button variant="ghost">Ghost button</Button>
          <Button variant="destructive">Destructive button</Button>
        </div>
      </div>
          {/* Checkbox section */}
          <div className="flex flex-col gap-4 w-full">
        <h2 className="text-lg font-bold">Checkbox</h2>
        <Separator />
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-fg2 text-sm cursor-pointer">
            <Checkbox 
              checked={checkbox1} 
              onCheckedChange={(checked) => setCheckbox1(checked === true)}
              aria-label="Interactive checkbox" 
            />
            Interactive - Click me!
          </label>
          <label className="flex items-center gap-2 text-fg2 text-sm cursor-pointer">
            <Checkbox 
              checked={checkbox2} 
              onCheckedChange={(checked) => setCheckbox2(checked === true)}
              aria-label="Another interactive checkbox" 
            />
            Also interactive
          </label>
          <label className="flex items-center gap-2 text-fg2 text-sm opacity-60 cursor-not-allowed">
            <Checkbox 
              checked={checkbox3} 
              disabled 
              aria-label="Checked, disabled" 
            />
            Checked (disabled)
          </label>
          <label className="flex items-center gap-2 text-fg2 text-sm opacity-60 cursor-not-allowed">
            <Checkbox 
              checked={checkbox4} 
              disabled 
              aria-label="Unchecked, disabled" 
            />
            Unchecked (disabled)
          </label>
        </div>
      </div>
          {/* Input section */}
          <div className="flex flex-col gap-4 w-full">
        <h2 className="text-lg font-bold">Input</h2>
        <Separator />
        <Input placeholder="Input" />
        <Textarea placeholder="Textarea" />
      </div>
          {/* Select section */}
          <div className="flex flex-col gap-4 w-full">
        <h2 className="text-lg font-bold">Select</h2>
        <Separator />
        <Select 
          variant="primary" 
          size="md" 
          value={selectValue} 
          onValueChange={setSelectValue}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option-1">Option 1</SelectItem>
            <SelectItem value="option-2">Option 2</SelectItem>
            <SelectItem value="option-3">Option 3</SelectItem>
          </SelectContent>
        </Select>
        {selectValue && (
          <p className="text-xs text-fg3">Selected: {selectValue}</p>
        )}
      </div>
          {/* Breadcrumb section */}
          <div className="flex flex-col gap-4 w-full">
        <h2 className="text-lg font-bold">Breadcrumb</h2>
        <Separator />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Project Name</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Sessions</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbId href="#">RM_dTTtaqrTdUJt</BreadcrumbId>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Participants</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
          {/* Dialog section */}
          <div className="flex flex-col gap-4 w-full">
        <h2 className="text-lg font-bold">Dialog</h2>
        <Separator />
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog Title</DialogTitle>
              <DialogDescription>Dialog Description</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 p-4">
              <Input placeholder="Input" />
              <Textarea placeholder="Textarea" />
            </div>
            <DialogFooter>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
          {/* Table section */}
          <div className="flex flex-col gap-4 w-full">
        <h2 className="text-lg font-bold">Table</h2>
        <Separator />
        <div className="overflow-x-auto rounded-lg border border-separator1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session ID</TableHead>
                <TableHead>Room name</TableHead>
                <TableHead>Started at</TableHead>
                <TableHead>Ended at</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Features</TableHead>
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
                  <TableCell>{session.endedAt}</TableCell>
                  <TableCell>{session.duration}</TableCell>
                  <TableCell>{session.participants}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      {session.features}
                    </Badge>
                  </TableCell>
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
      </div>
          {/* Tabs section */}
          <div className="flex flex-col gap-4 w-full">
        <h2 className="text-lg font-bold">Tabs</h2>
        <Separator />
        <Tabs defaultValue="1">
          <TabsList>
            <TabsTrigger value="1">Tab 1</TabsTrigger>
            <TabsTrigger value="2">Tab 2</TabsTrigger>
            <TabsTrigger value="3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="1" className="flex flex-col gap-4 p-4 bg-bg2">
            Tab 1
          </TabsContent>
          <TabsContent value="2" className="flex flex-col gap-4 p-4 bg-bg2">
            Tab 2
          </TabsContent>
          <TabsContent value="3" className="flex flex-col gap-4 p-4 bg-bg2">
            Tab 3
          </TabsContent>
        </Tabs>
      </div>
        </div>
      </div>
    </div>
  );
}
