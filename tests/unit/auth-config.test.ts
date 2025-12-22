import { describe, it, expect } from 'vitest';
import { handlers, auth, signIn, signOut } from '../../auth';

describe('Auth Configuration', () => {
  it('should export auth handlers', () => {
    expect(handlers).toBeDefined();
    expect(handlers.GET).toBeDefined();
    expect(handlers.POST).toBeDefined();
    expect(auth).toBeDefined();
    expect(signIn).toBeDefined();
    expect(signOut).toBeDefined();
  });
});
