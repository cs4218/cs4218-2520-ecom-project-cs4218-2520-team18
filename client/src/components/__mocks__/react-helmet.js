import React from 'react';

export function Helmet({ children, ...props }) {
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === 'meta') {
      return React.cloneElement(child, {
        'data-testid': 'helmet-meta',
        ...child.props,
      });
    }
    return child;
  });
  return (
    <div data-testid="helmet-mock" {...props}>
      {enhancedChildren}
    </div>
  );
}
