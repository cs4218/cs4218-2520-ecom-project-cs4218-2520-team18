import React from 'react';

export default function MockDropIn({ onInstance }) {
  React.useEffect(() => {
    onInstance({
      requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: 'fake-nonce' }),
    });
  }, []);
  return <div data-testid="dropin" />;
}
