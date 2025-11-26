import React from "react";

export function IconUsers({ size=16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 12c2.7 0 4.88-2.2 4.88-4.9S14.7 2.2 12 2.2 7.12 4.4 7.12 7.1 9.3 12 12 12z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path>
      <path d="M21 21v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path>
    </svg>
  );
}

export function IconRoles({ size=16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"></path>
      <path d="M5 9l7 13 7-13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path>
    </svg>
  );
}

export function IconPermissions({ size=16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2l9 4v6c0 7-9 10-9 10S3 19 3 12V6l9-4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path>
    </svg>
  );
}

export function IconPlants({ size=16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2v8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"></path>
      <path d="M5 13c2 2.5 5 4 7 4s5-1.5 7-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"></path>
    </svg>
  );
}
