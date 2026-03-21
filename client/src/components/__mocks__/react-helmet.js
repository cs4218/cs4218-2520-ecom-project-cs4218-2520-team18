import React, { useEffect } from 'react';

export function Helmet({ children }) {
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === 'meta') {
      return React.cloneElement(child, {
        ...child.props,
        'data-testid': 'helmet-meta',
      });
    }
    return child;
  });
  return (
    <div data-testid="helmet-mock">
      {enhancedChildren}
    </div>
  );
}
