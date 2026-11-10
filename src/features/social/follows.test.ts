import { canFollow, followId } from './follows';

describe('followId', () => {
  it('joins follower and followed with _', () => {
    expect(followId('a1', 'b2')).toBe('a1_b2');
  });
});

describe('canFollow', () => {
  it('lets people follow others but not themselves', () => {
    expect(canFollow('a1', 'b2')).toBe(true);
    expect(canFollow('a1', 'a1')).toBe(false);
  });
});
