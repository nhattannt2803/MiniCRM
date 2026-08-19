import { parseFbPsidInput, parseZaloUidInput } from '../src/utils/identityHelper';
import { LeadService } from '../src/services/LeadService';

describe('IdentityHelper & Smax Parsing', () => {
  describe('parseFbPsidInput', () => {
    it('should correctly format standard pageId_threadId', () => {
      expect(parseFbPsidInput('760420303821103_3001946553490860')).toBe('fb760420303821103_3001946553490860');
      expect(parseFbPsidInput('fb760420303821103_3001946553490860')).toBe('fb760420303821103_3001946553490860');
    });

    it('should strip t_ prefix from threadId in formatted PSID', () => {
      expect(parseFbPsidInput('fb760420303821103_t_3001946553490860')).toBe('fb760420303821103_3001946553490860');
      expect(parseFbPsidInput('760420303821103_t_3001946553490860')).toBe('fb760420303821103_3001946553490860');
    });

    it('should parse smax.ai URL correctly with tid', () => {
      const url = 'https://smax.ai/bizs/xe-dien-move/chats/fb760420303821103?tid=fb37071884289124847';
      expect(parseFbPsidInput(url)).toBe('fb760420303821103_37071884289124847');
    });

    it('should parse smax.ai URL with t_ in tid', () => {
      const url = 'https://smax.ai/bizs/xe-dien-move/chats/fb760420303821103?tid=t_3001946553490860';
      expect(parseFbPsidInput(url)).toBe('fb760420303821103_3001946553490860');
    });
  });

  describe('LeadService.parseSmaxUrl', () => {
    it('should parse smax url components correctly', () => {
      const parsed = LeadService.parseSmaxUrl('https://smax.ai/bizs/xe-dien-move/chats/fb760420303821103?tid=fb37071884289124847');
      expect(parsed).toEqual({
        biz: 'xe-dien-move',
        pageId: 'fb760420303821103',
        threadId: 'fb37071884289124847',
      });
    });
  });
});
