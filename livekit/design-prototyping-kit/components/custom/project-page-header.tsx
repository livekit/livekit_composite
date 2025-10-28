"use client"

import * as React from "react"
import { 
  BreadcrumbId,
  BreadcrumbLink,
  BreadcrumbPage 
} from "@/components/ui/breadcrumb"

export const PAGE_HEADER_PORTAL_ID = "page-header-portal"

export type BreadcrumbCrumb = {
  label: string
  href?: string
  kind?: "default" | "id"
  isActive?: boolean
}

interface ProjectPageHeaderProps {
  /** Array of breadcrumb items to display */
  crumbs?: BreadcrumbCrumb[]
  /** Optional page title override. If not provided, uses the last crumb label */
  pageTitle?: string
  /** Children will be rendered in the right side of the header */
  children?: React.ReactNode
  /** Optional scroll container ref. If not provided, will try to find the parent scroll container */
  scrollContainerRef?: React.RefObject<HTMLElement>
}

export function ProjectPageHeader({ 
  crumbs = [], 
  pageTitle, 
  children,
  scrollContainerRef 
}: ProjectPageHeaderProps) {
  const [scrollY, setScrollY] = React.useState(0)

  React.useEffect(() => {
    const scrollContainer = scrollContainerRef?.current || 
      document.querySelector('[data-scroll-container]') as HTMLElement
    
    if (!scrollContainer) return

    const handleScroll = () => {
      setScrollY(scrollContainer.scrollTop)
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [scrollContainerRef])

  // Height constants (in rem)
  const H_FULL = 3.75
  const H_COMPACT = 2.75
  
  // Calculate progress (0 to 1) based on scroll position
  const progress = Math.min(Math.max(scrollY / (H_FULL * 16), 0), 1)
  
  // Container height animation
  const h_container = `${H_FULL - (H_FULL - H_COMPACT) * progress}rem`

  // Line 1 animations (last breadcrumb fade in when scrolling)
  const l1_transform = `translateY(calc(1.2rem * ${1 - progress}))`
  const l1_visibility = progress > 0.01 ? 'block' : 'none'
  const l1_opacity = progress

  // Line 2 animations (page title collapse when scrolling)
  const l2_height = `calc(1.2rem * ${1 - progress})`
  const l2_mt = `calc(0.25rem * ${1 - progress})`
  const l2_top = `calc(1.2rem * ${0 - progress})`
  const l2_visibility = progress > 0.99 ? 'none' : 'inline-block'

  const firstRowCrumbs = crumbs.slice(0, -1)
  const lastCrumb = crumbs[crumbs.length - 1]
  const title = pageTitle ?? lastCrumb?.label

  return (
    <div
      style={{ height: h_container, transition: 'height 150ms ease-out' }}
      className="sticky top-0 z-50 flex w-full flex-row place-content-between gap-1 border-b border-separator1 bg-bg1 px-4"
    >
      {/* Breadcrumbs and Title */}
      <div className="flex flex-col justify-center">
        {/* Line 1: Breadcrumb trail */}
        <div className="inline-flex items-center gap-x-1.5 whitespace-nowrap text-sm text-fg1">
          {firstRowCrumbs.map((crumb, index) => (
            <React.Fragment key={`${crumb.label}-${index}`}>
              <span className="contents">
                {crumb.kind === "id" ? (
                  <BreadcrumbId href={crumb.href}>{crumb.label}</BreadcrumbId>
                ) : (
                  <BreadcrumbLink href={crumb.href ?? "#"}>
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </span>
              <span className="text-fg4">/</span>
            </React.Fragment>
          ))}
          {lastCrumb && (
            <div style={{ display: l1_visibility, opacity: l1_opacity, transition: 'opacity 150ms ease-out' }} className="relative overflow-hidden">
              <div style={{ transform: l1_transform, transition: 'transform 150ms ease-out' }}>
                <span className="contents">
                  {lastCrumb.kind === "id" ? (
                    <BreadcrumbId>{lastCrumb.label}</BreadcrumbId>
                  ) : (
                    <BreadcrumbPage>{lastCrumb.label}</BreadcrumbPage>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Line 2: Page title */}
        {title && (
          <h1
            style={{ 
              height: l2_height, 
              marginTop: l2_mt, 
              display: l2_visibility,
              transition: 'height 150ms ease-out, margin-top 150ms ease-out'
            }}
            className="relative overflow-hidden text-base font-semibold leading-none text-fg0"
          >
            <span
              style={{ 
                top: l2_top,
                transition: 'top 150ms ease-out'
              }}
              className="absolute inset-0 inline-flex items-center gap-2 whitespace-nowrap"
            >
              {title}
            </span>
          </h1>
        )}
      </div>

      {/* Portal for additional content */}
      <div id={PAGE_HEADER_PORTAL_ID} className="flex shrink-0 items-center gap-2">
        {children}
      </div>
    </div>
  )
}

