import React, { useEffect } from 'react';

export function Helmet({ children }) {
  useEffect(() => {
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        if (child.type === 'title') {
          document.title = child.props.children;
        }
        if (child.type === 'meta') {
          return React.cloneElement(child, {
            ...child.props,
            'data-testid': 'helmet-meta',
          });
        }
      }
    });
    return () => {
      const metas = document.head.querySelectorAll(
        'meta[data-testid="helmet-meta"]',
      );
      metas.forEach((meta) => meta.remove());
    };
  }, [children]);
  return <div data-testid="helmet-mock">{children}</div>;
}
