import React, { useEffect } from 'react';

export function Helmet({ children }) {
  useEffect(() => {
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        if (child.type === 'title') {
          document.title = child.props.children;
        }
        if (child.type === 'meta') {
          const meta = document.createElement('meta');
          Object.entries(child.props).forEach(([key, value]) => {
            if (key !== 'children' && key !== 'data-testid') {
              meta.setAttribute(key, value);
            }
          });
          meta.setAttribute('data-testid', 'helmet-meta');
          document.head.appendChild(meta);
        }
      }
    });
    // Cleanup: remove added meta tags after unmount
    return () => {
      const metas = document.head.querySelectorAll(
        'meta[data-testid="helmet-meta"]',
      );
      metas.forEach((meta) => meta.remove());
    };
  }, [children]);
  return <div data-testid="helmet-mock">{children}</div>;
}
