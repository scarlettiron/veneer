import type { ReactNode } from 'react';

import { VeneerProvider, VeneerEditBar } from '@veneer/next';

//Wrap the whole app in the provider so any page can use editable content.
//The edit bar gives a place to sign in and turn edit mode on.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <VeneerProvider apiBasePath="/api/veneer">
          {children}
          <VeneerEditBar />
        </VeneerProvider>
      </body>
    </html>
  );
}
