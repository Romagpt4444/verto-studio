#!/usr/bin/env bash
# Внешние ссылки главных страниц (RU и EN): код ответа после редиректов. Нужен dist/.
set -u
urls=$(grep -ohE 'href="https?://[^"]+"' dist/index.html dist/en/index.html | sed -E 's/href="([^"]+)"/\1/; s/\?text=.*//' | grep -v 'vertostudio.ru' | sort -u)
fail=0
for u in $urls; do
  for try in 1 2 3; do code=$(curl -s -o /dev/null -L -m 20 -A "Mozilla/5.0 (Macintosh) VertoLinkCheck" -w "%{http_code}" "$u"); [ "$code" != 000 ] && break; done
  printf "%-55s %s\n" "$u" "$code"
  case "$code" in 2*|3*) ;; 429|403|999) echo "   ↳ сервис ограничивает роботов, ссылка корректна по формату";; *) fail=1;; esac
done
[ $fail = 0 ] && echo LINKS_OK || { echo LINKS_FAIL; exit 1; }
