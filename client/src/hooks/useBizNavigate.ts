import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export const useBizNavigate = () => {
  const navigate = useNavigate();
  const { bizSlug } = useParams<{ bizSlug: string }>();
  const { activeBiz, businesses } = useAuthStore();

  return (path: string | number, options?: any) => {
    if (typeof path === 'number') {
      return navigate(path);
    }

    if (
      path.startsWith('/system') ||
      path.startsWith('/login') ||
      path.startsWith('/register') ||
      path.startsWith('/no-business')
    ) {
      return navigate(path, options);
    }

    const currentSlug = bizSlug || activeBiz?.slug || (businesses[0] ? businesses[0].slug : null);

    if (path.startsWith('/')) {
      const firstSegment = path.split('/')[1];
      const matchesBiz = businesses.some((b) => b.slug === firstSegment);
      if (matchesBiz) {
        return navigate(path, options);
      }
      if (currentSlug) {
        return navigate(`/${currentSlug}${path}`, options);
      }
    }

    return navigate(path, options);
  };
};
