// Kumpulan ikon SVG minimal (stroke-based) - sengaja tidak pakai library ikon
// eksternal supaya dependency tetap ringan.
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function IconHome(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}

export function IconCalendar(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  )
}

export function IconCheckCircle(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.3 11 14.8l4.5-5.6" />
    </svg>
  )
}

export function IconGrid(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </svg>
  )
}

export function IconFingerprint(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5c-4.7 0-8.5 3.8-8.5 8.5 0 2 .4 3.5.9 5" />
      <path d="M12 3.5c4.7 0 8.5 3.8 8.5 8.5 0 1.4-.15 2.6-.45 3.7" />
      <path d="M7 20c-.9-1.6-1.5-3.6-1.5-6.5A6.5 6.5 0 0 1 18.4 9" />
      <path d="M9.5 20.5C8.3 18.6 7.5 16.4 7.5 13.5a4.5 4.5 0 0 1 9 0c0 1 -.1 1.9 -.3 2.7" />
      <path d="M12 17.5v-4a2.5 2.5 0 0 1 5 0c0 1.3 -.2 2.3 -.5 3.2" />
    </svg>
  )
}

export function IconClock(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  )
}

export function IconLock(props) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  )
}

export function IconChevronRight(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 5.5 15.5 12 9 18.5" />
    </svg>
  )
}

export function IconBell(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  )
}
