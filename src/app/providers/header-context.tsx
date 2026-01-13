import { createContext, useState } from 'react';
import type { HeaderConfig } from '@/shared/lib/header-schema';

interface HeaderContextType {
  headerConfig: HeaderConfig | null;
  setHeaderConfig: (config: HeaderConfig | null) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export const HeaderProvider = ({ children }: { children: React.ReactNode }) => {
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig | null>(null);

  return (
    <HeaderContext.Provider value={{ headerConfig, setHeaderConfig }}>
      {children}
    </HeaderContext.Provider>
  );
};
