export const LOGO_SRC = '/logo.png';
export const LOGO_MARK_SRC = '/logo-mark.png';

type Props = {
  className?: string;
  alt?: string;
  mark?: boolean;
};

export function BrandLogo({ className, alt = 'Multigate Medical Supplies Limited', mark = false }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={mark ? LOGO_MARK_SRC : LOGO_SRC} alt={alt} className={className} />
  );
}
