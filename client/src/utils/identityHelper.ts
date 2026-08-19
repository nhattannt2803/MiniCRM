/**
 * Helper parsing utilities for Multichannel Identities (Facebook PSID, Zalo UID, etc.)
 */

export const parseFbPsidInput = (input: string): string => {
  if (!input) return '';
  const trimmed = input.trim();

  // 1. Check if input is already formatted as "fbPageId_ThreadId" (with optional fb or t_ prefix)
  const combinedMatch = trimmed.match(/^(?:fb)?([0-9]+)_(?:fb|t_)?([0-9]+)$/i);
  if (combinedMatch) {
    return `fb${combinedMatch[1]}_${combinedMatch[2]}`;
  }

  // 2. Parse Pancake.vn / pages.fm link format:
  if (trimmed.includes('pancake.vn') || trimmed.includes('pages.fm') || trimmed.includes('c_id=')) {
    try {
      const cIdMatch = trimmed.match(/[?&]c_id=(?:fb)?([0-9]+)_(?:fb|t_)?([0-9]+)/i);
      if (cIdMatch) {
        return `fb${cIdMatch[1]}_${cIdMatch[2]}`;
      }
    } catch (e) {
      console.error('Error parsing Pancake URL:', e);
    }
  }

  // 3. Parse Smax.ai chat link format:
  if (trimmed.includes('smax.ai') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const pageMatch = trimmed.match(/\/(?:chats|pages)\/(?:fb)?([0-9]+)/i);
      const tidMatch = trimmed.match(/(?:[?&]tid=|threads\/)(?:fb|t_)?([0-9]+)/i);

      if (pageMatch && tidMatch) {
        return `fb${pageMatch[1]}_${tidMatch[1]}`;
      } else if (pageMatch) {
        return `fb${pageMatch[1]}`;
      } else if (tidMatch) {
        return `fb_${tidMatch[1]}`;
      }
    } catch (e) {
      console.error('Error parsing Smax.ai URL:', e);
    }
  }

  return trimmed;
};

export const parseZaloUidInput = (input: string): string => {
  if (!input) return '';
  const trimmed = input.trim();

  // 1. Parse Pancake Zalo link format:
  // e.g. https://pancake.vn/pzl_84764479528?c_id=pzl_u_790570093805246893_5380508951926344446
  if (trimmed.includes('pancake.vn') || trimmed.includes('pages.fm') || trimmed.includes('pzl_')) {
    try {
      const cIdMatch = trimmed.match(/[?&]c_id=(pzl_u_|zlw_)?([0-9]+_[0-9]+)/i);
      if (cIdMatch) {
        return `zlw${cIdMatch[2]}`;
      }
    } catch (e) {
      console.error('Error parsing Pancake Zalo URL:', e);
    }
  }

  // 2. Parse Smax Zalo link format:
  // e.g. https://smax.ai/bizs/cong-ty-tnhh-taste-master/chats/zlw714812424318830894?tid=zlw5312071838944287357
  if (trimmed.includes('smax.ai') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const chatMatch = trimmed.match(/\/chats\/(zlw)?([0-9]+)/i);
      const tidMatch = trimmed.match(/[?&]tid=(zlw)?([0-9]+)/i);

      if (chatMatch && tidMatch) {
        const oaId = `zlw${chatMatch[2]}`;
        const userId = tidMatch[2];
        return `${oaId}_${userId}`;
      } else if (chatMatch) {
        return `zlw${chatMatch[2]}`;
      } else if (tidMatch) {
        return `zlw_${tidMatch[2]}`;
      }
    } catch (e) {
      console.error('Error parsing Smax Zalo URL:', e);
    }
  }

  return trimmed;
};
