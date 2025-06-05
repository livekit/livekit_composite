//
//  main.m
//  objc-minimal
//
//  Created by Hiroshi Horie on 2022/09/02.
//

#import "AppDelegate.h"
#import <Cocoa/Cocoa.h>

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        // Setup code that might create autoreleased objects goes here.
        [NSApplication sharedApplication];
        [NSApp setDelegate:[[AppDelegate alloc] init]];
        [NSApp run];
    }
}
