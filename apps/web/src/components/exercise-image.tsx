// Imagem do exercício: alterna entre posição inicial e final (estilo "GIF" leve, só CSS).
import { cx } from "./ui";
import { Icon } from "./icons";

export function ExerciseImage({
  images,
  name,
  className,
  size = "md",
}: {
  images: string[] | null | undefined;
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "sm" ? "h-14 w-14 rounded-xl" : size === "lg" ? "aspect-[4/3] w-full rounded-2xl" : "aspect-[4/3] w-full rounded-xl";
  if (!images?.length) {
    return (
      <div className={cx("grid shrink-0 place-items-center bg-zinc-100 text-zinc-400", box, className)} aria-label={name}>
        <Icon name="dumbbell" size={size === "sm" ? 22 : 36} />
      </div>
    );
  }
  const [a, b] = images;
  return (
    <div className={cx("relative shrink-0 overflow-hidden bg-white ring-1 ring-zinc-100", box, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={a} alt={name} loading="lazy" className="absolute inset-0 h-full w-full object-contain" />
      {b && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b} alt="" aria-hidden loading="lazy" className="ex-frame-b absolute inset-0 h-full w-full object-contain" />
      )}
    </div>
  );
}
