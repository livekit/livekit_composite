'use client';

import { CpuChipIcon, CubeTransparentIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";

interface NavigationSidebarProps {
    currentPath?: string;
}

export function NavigationSidebar({ currentPath }: NavigationSidebarProps) {
    const navItems = [
        { href: "/", icon: CpuChipIcon, label: "Control" },
        { href: "/lidar", icon: CubeTransparentIcon, label: "LiDAR" },
    ];

    const isActive = (path: string) => currentPath === path;

    return (
        <div className="relative hidden h-screen w-20 flex-shrink-0 flex-col items-center border-r border-white/10 bg-panel/40 px-3 py-8 backdrop-blur-2xl sm:flex">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-3 shadow-card">
                <Image
                    src="/livekit-logo.svg"
                    alt="LiveKit Logo"
                    width={32}
                    height={32}
                    className="rounded-lg"
                />
            </div>
            <nav className="mt-8 flex flex-col items-center gap-4">
                {navItems.map(({ href, icon: Icon, label }) => (
                    <Link
                        key={href}
                        href={href}
                        className={clsx(
                            "group relative flex h-12 w-12 items-center justify-center rounded-2xl border text-fg2 transition",
                            isActive(href)
                                ? "border-accent/70 bg-accent/10 text-white shadow-card"
                                : "border-white/10 bg-white/5 hover:border-white/30 hover:text-white"
                        )}
                    >
                        <Icon className="h-5 w-5" />
                        <span className="sr-only">{label}</span>
                        <span
                            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 blur-2xl transition group-hover:opacity-100"
                            style={{ boxShadow: "0 0 25px rgba(30, 213, 249, 0.35)" }}
                            aria-hidden="true"
                        />
                    </Link>
                ))}
            </nav>
        </div>
    );
} 
