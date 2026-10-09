// Адаптивное качество: если средний кадр за 2 с дольше 22 мс — один раз снижаем нагрузку.
export function createQuality(degrade: () => void) {
  let acc = 0;
  let n = 0;
  let windowMs = 0;
  let done = false;
  let warm = 0;
  return {
    sample(dtMs: number) {
      if (done) return;
      warm += dtMs;
      if (warm < 1500) return; // первые кадры (компиляция шейдеров) не считаем
      if (dtMs > 200) return; // вкладка была скрыта
      acc += dtMs; n++; windowMs += dtMs;
      if (windowMs >= 2000) {
        if (acc / n > 22) { done = true; degrade(); }
        acc = 0; n = 0; windowMs = 0;
      }
    },
  };
}
