import { HeaderContext } from '@/app/providers/header-context';
import { useContext } from 'react';

export const useSetHeaderConfig = () => {
  const context = useContext(HeaderContext);
  if (!context) throw new Error('useSetHeaderConfig must be used within HeaderProvider');
  return context.setHeaderConfig;
};

export const useHeaderConfig = () => {
  const context = useContext(HeaderContext);
  if (!context) throw new Error('useHeaderConfig must be used within HeaderProvider');
  return context.headerConfig;
};
