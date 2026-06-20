import * as Icons from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
}

export function CategoryIcon({ name, className = 'w-5 h-5' }: CategoryIconProps) {
  // Fallback map in case of mismatch
  const normalizedName = name === 'Running' ? 'Flame' : name;
  const IconComponent = (Icons as any)[normalizedName] || Icons.Activity;
  
  return <IconComponent className={className} />;
}
