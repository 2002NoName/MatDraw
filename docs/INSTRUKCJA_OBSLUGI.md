# MatDraw – instrukcja obsługi

Spis treści:

1. [Pierwsze uruchomienie](#1-pierwsze-uruchomienie)
2. [Instrukcja dla korepetytorki](#2-instrukcja-dla-korepetytorki)
3. [Instrukcja dla ucznia](#3-instrukcja-dla-ucznia)
4. [Praca na tablicy](#4-praca-na-tablicy)
5. [Rozpoznawanie pisma](#5-rozpoznawanie-pisma)
6. [Skróty klawiszowe i gesty](#6-skróty-klawiszowe-i-gesty)
7. [Rozwiązywanie problemów](#7-rozwiązywanie-problemów)

---

## 1. Pierwsze uruchomienie

### Gdzie uruchomić MatDraw

MatDraw to **aplikacja webowa** – nie trzeba niczego instalować. Otwórz w przeglądarce adres
**<https://matdraw.weblance-devs.pl>**.

| Urządzenie | Przeglądarka |
|---|---|
| Windows 10/11 | Microsoft Edge lub Google Chrome (pióro Surface Pen / Wacom z siłą nacisku) |
| macOS | Safari, Chrome lub Edge |
| iPad | Safari (Apple Pencil z siłą nacisku). Wygodny skrót: *Udostępnij → Do ekranu początkowego*. |

### Konto korepetytorki (Weronika Janeczek)

Konto korepetytorki jest zakładane automatycznie przy instalacji serwera:

| Login (e‑mail) | Hasło |
|---|---|
| `weronika@matdraw.weblance-devs.pl` | `Tablica#Matura2025` |

Jeśli administrator ustawił przy wdrożeniu własne hasło (`SEED_TUTOR_PASSWORD`), obowiązuje to hasło.
Po pierwszym zalogowaniu zmień hasło na stronie **Moje konto** (patrz niżej).

> MatDraw jest przeznaczony wyłącznie dla osób autoryzowanych przez twórców (Michał Kozieński, Weblance.pl).

### Zakładanie konta

1. Na ekranie logowania wybierz **Załóż konto**.
2. Wybierz rodzaj konta: **Uczeń** lub **Korepetytorka**.
3. Podaj imię i nazwisko, opcjonalnie **widoczną nazwę** (tak zobaczą Cię inni na tablicy, np. „Kasia”),
   e‑mail i hasło (min. 8 znaków).
4. Konto korepetytorki wymaga **kodu rejestracyjnego** – otrzymasz go od administratora serwera.

### Moje konto – edycja danych i hasła

Na stronie głównej kliknij swoją nazwę w prawym górnym rogu (lub otwórz `/konto`). Strona jest taka sama
dla korepetytorki i ucznia:

- **Dane konta** – widoczna nazwa (pokazywana innym przy kursorze i na liście osób na tablicy),
  imię i nazwisko, e‑mail (login). Zmiana **e‑maila** wymaga podania obecnego hasła.
- **Zmiana hasła** – podaj obecne hasło, nowe hasło (min. 8 znaków) i powtórz je.

Po zapisaniu zmiany obowiązują od razu – kolejne logowanie odbywa się nowym e‑mailem / hasłem.

---

## 2. Instrukcja dla korepetytorki

### Tworzenie tablicy

Na stronie głównej wpisz nazwę (np. „Funkcja kwadratowa – Jan”) i kliknij **+ Nowa tablica**.
Lista **Wszystkie tablice** zawiera każdą tablicę w systemie. Przy tablicy znajdziesz przyciski
**Uczestnicy**, **Zmień nazwę** i **Usuń**.

### Zapraszanie ucznia (kod)

1. Kliknij **Uczestnicy** przy tablicy (na liście) lub **Zaproś / uczestnicy** (w prawym górnym rogu tablicy).
2. W sekcji **Nowy kod zaproszenia** możesz ustawić:
   - **etykietę** – dla kogo jest kod (np. „Ania – klasa 7”),
   - **ważność** – 1 godzina, 24 godziny, 7 dni, 30 dni lub bez limitu,
   - **limit użyć** – ile osób może użyć kodu (1 = kod jednorazowy).
3. Kliknij **Wygeneruj kod**. Kod (np. `J9F4-GU8B`) jest automatycznie kopiowany do schowka –
   wyślij go uczniowi (SMS, komunikator, e‑mail).
4. Możesz wygenerować **dowolnie wiele kodów** – np. osobny dla każdego ucznia lub rodzica.

Zamiast kodu możesz dodać ucznia bezpośrednio: **Dodaj ucznia po e‑mailu** (uczeń musi mieć już konto).

### Zarządzanie kodami

Lista **Kody** pokazuje stan każdego kodu (aktywny / wygasł / wykorzystany / unieważniony) i liczbę użyć.
**Unieważnij** blokuje kod – nikt już nim nie dołączy (osoby, które dołączyły wcześniej, zostają).

### Zarządzanie uczestnikami

W sekcji **Uczestnicy**:

- pole **edycja** – odznacz, aby uczeń mógł tylko **oglądać** tablicę (np. podczas wyjaśniania);
  zaznacz ponownie, by mógł pisać. Zmiana działa natychmiast.
- **Usuń** – usuwa osobę z tablicy; jeśli ma tablicę otwartą, zostanie **natychmiast rozłączona**
  i straci do niej dostęp. Aby wróciła, potrzebny jest nowy kod.

### Podczas lekcji

- W nagłówku tablicy widać osoby obecne na tablicy. Kolor obramowania = kolor kursora tej osoby.
  Ikona przy imieniu pokazuje rodzaj połączenia: bezpośrednie (P2P), przez serwer TURN, lub przez serwer MatDraw.
- Zielona kropka przy nazwie tablicy = połączenie z serwerem aktywne (tablica się zapisuje).
- **Kursory:** widzisz, gdzie pisze uczeń – jego kursor jest kolorowy (pierwszy uczeń: niebieski) z czarną
  obwódką i etykietą z jego imieniem. Twój własny kursor jest biały z czarną obwódką i bez etykiety;
  uczeń widzi go jako **różowy** z etykietą Twojego imienia. Przy piórze/trackpadzie kursor drugiej osoby
  zostaje w ostatnim miejscu i znika po 5 s bez ruchu.
- **Diagnostyka połączeń:** ikona pulsu w nagłówku tablicy (lub `Ctrl+Shift+D`) – patrz rozdział 7.

---

## 3. Instrukcja dla ucznia

1. Załóż konto typu **Uczeń** i zaloguj się.
2. Na stronie głównej wpisz w pole **Kod, np. ABCD-EFGH** kod otrzymany od korepetytorki
   (wielkość liter i myślnik nie mają znaczenia) i kliknij **Dołącz kodem**.
3. Tablica otworzy się automatycznie i od teraz będzie widoczna na liście **Moje tablice**
   – przy kolejnych lekcjach wystarczy ją kliknąć.
4. Jeśli przy tablicy widnieje **tylko odczyt**, korepetytorka wyłączyła Ci edycję – możesz oglądać,
   przesuwać i powiększać widok, ale nie pisać.
5. Tablicę możesz usunąć ze swojej listy przyciskiem **Opuść** (tablica pozostaje u korepetytorki).
6. Kursor korepetytorki widzisz jako **różowy** z etykietą jej imienia – pokazuje, gdzie właśnie pisze.
   Twój kursor jest u Ciebie biały, a korepetytorka widzi go w Twoim kolorze (np. niebieskim) z Twoim imieniem.

---

## 4. Praca na tablicy

### Pasek narzędzi (po lewej)

| Ikona | Narzędzie | Jak używać |
|---|---|---|
| ↖ | **Zaznaczanie** | Kliknij element lub obrysuj kilka prostokątem. Przeciągnij, aby przesunąć; uchwyt w rogu – zmiana rozmiaru; okrągły uchwyt nad bryłą 3D – obrót. Dwuklik (dwa stuknięcia) na wzorze/tekście/wykresie – edycja. |
| ✥ | **Przesuwanie widoku** | Przeciągnij tablicę. |
| ✎ | **Pióro** | Pisz rysikiem, palcem lub myszą. Grubość kreski zależy od nacisku rysika. |
| 🖍 | **Zakreślacz** | Półprzezroczyste podkreślenia. |
| ⌫ | **Gumka** | Przeciągnij po elementach, które chcesz usunąć. |
| □△ | **Figury 2D** | Wybierz figurę w górnym pasku i przeciągnij na tablicy (kliknięcie wstawia figurę o domyślnym rozmiarze). Opcja *wypełnienie*. |
| ⬡ | **Bryły 3D** | Wybierz bryłę i przeciągnij/kliknij. Obracaj uchwytem obrotu; przycisk na pasku zaznaczenia włącza/wyłącza krawędzie niewidoczne (przerywane). |
| √ | **Wzór** | Kliknij w miejscu wzoru → wpisz LaTeX lub użyj palety symboli → **Wstaw**. |
| ✎✦ | **Rozpoznaj pismo** | Patrz rozdział 5. |
| T | **Tekst** | Kliknij w miejscu tekstu, wpisz treść. |
| 📈 | **Wykres funkcji** | Wpisz np. `x^2 - 2x - 3`, `sin(x)`, `sqrt(x)`, ustaw zakres osi → podgląd → **Wstaw**. |
| 🖼 | **Wstaw obraz** | Wybierz zdjęcie lub grafikę z dysku (na iPadzie: galeria, aparat lub Pliki). Patrz niżej. |
| 📖 | **Wzory maturalne CKE** | Otwiera / zamyka panel wzorów maturalnych. Patrz niżej. |

### Obrazy

Obraz wstawisz na trzy sposoby:

1. Przycisk **Wstaw obraz** na lewym pasku → wybierz plik (można kilka naraz).
2. **Ctrl+V** (⌘V) – wklejenie obrazu ze schowka, np. zrzutu ekranu (*Win+Shift+S* w Windows,
   *⌘⇧4* z Ctrl na macOS). Obraz pojawi się na środku widoku.
3. **Przeciągnij plik** z Eksploratora / Findera i upuść na tablicę – w miejscu upuszczenia.

Wstawiony obraz jest zaznaczony – przeciągnij, aby go przesunąć, uchwytem w rogu zmień rozmiar
(proporcje zostają zachowane). Na obrazie można pisać piórem (np. zaznaczać fragmenty zadania).
Duże zdjęcia są automatycznie zmniejszane, dzięki czemu tablica szybko się synchronizuje.

### Wzory maturalne CKE

Zestaw wzorów, z których uczniowie korzystają na maturze (wg broszury CKE „Wybrane wzory matematyczne”).

1. Na tablicy kliknij ikonę **książki** (*Wzory maturalne CKE*) na lewym pasku – z prawej strony otworzy się panel.
2. Wpisz szukane słowo (np. *delta*, *stożek*, *sinus*, *ciąg geometryczny*) lub rozwiń dział.
   Filtr **Podstawowy / Tylko rozszerzony** ogranicza listę do poziomu matury; wzory z poziomu
   rozszerzonego mają oznaczenie **R**.
3. **Przeciągnij wzór na tablicę** – myszą, rysikiem lub palcem. Na iPadzie przeciągaj **w bok**
   (ruch w górę/dół przewija listę). Wzór pojawi się jako obraz (kartka z nazwą i wzorem) w miejscu upuszczenia.
4. Albo kliknij **+** przy wzorze – zostanie wstawiony na środek widoku.
5. Przycisk **?** przy wzorze rozwija **opis**: co oznacza wzór, kiedy i jak go użyć oraz rozwiązany przykład.

Na końcu listy jest dział **16. Tablica wartości funkcji trygonometrycznych** – sin, cos i tg dla kątów
0°–90° (jak w tablicach maturalnych). Wartość odczytujesz w wierszu kąta; znając wartość funkcji, znajdź
najbliższą liczbę w kolumnie i odczytaj kąt. Tablicę też można przeciągnąć na tablicę jako obraz.

Wstawiony wzór widzą wszyscy uczestnicy – można go przesunąć, powiększyć, dopisać obok przykład
lub obrysować piórem fragment, który omawiamy.

Wzory można też przeglądać bez otwierania tablicy: link **Wzory CKE** w górnym pasku listy tablic
(strona `/wzory`). Uczeń z prawem tylko do podglądu może przeglądać wzory, ale nie wstawia ich na tablicę.
Na stronie `/wzory` **kliknij wzór**, aby rozwinąć opis z przykładem; ponowne kliknięcie go zwija.

### Górny pasek opcji

Cofnij / ponów, kolory (7 + dowolny), grubości, wybór figury/bryły, **tylko rysik**, tło
(gładkie, kratka, linie, kropki), **wyczyść tablicę** (z potwierdzeniem; można cofnąć).

**Własny kolor:** kliknij ostatnie, tęczowe kółko palety. W oknie wybierz kolor w dużym kwadracie
(nasycenie i jasność) i na pasku odcienia, wpisz kod **HEX** (np. `#1971c2`) i zatwierdź Enterem albo
kliknij gotowy kolor z palety lub z listy *Ostatnio używane* (dwuklik wybiera od razu). Lewa połówka
podglądu to poprzedni kolor – kliknij ją, aby do niego wrócić. **Wybierz** zatwierdza, **Anuluj** lub Esc
zamyka okno bez zmian.

**Tylko rysik** – gdy włączone, rysuje wyłącznie rysik, a dotyk palcem/dłonią przesuwa widok.
Opcja włącza się sama po pierwszym użyciu rysika (Apple Pencil, Surface Pen) – dzięki temu
oparta dłoń nie zostawia śladów.

### Pasek zaznaczenia

Po zaznaczeniu elementów pojawia się pasek: **Edytuj**, **Krawędzie niewidoczne** (bryły),
**Na wierzch**, **Duplikuj**, **Usuń**.

### Powiększenie

Prawy dolny róg: − / + oraz **pokaż całość** (dopasowanie widoku do zawartości). Kliknięcie
procentów przywraca 100 %.

### Zapis

Tablica zapisuje się automatycznie na serwerze. Pasek „Utracono połączenie – ponawianie…” oznacza chwilową
utratę połączenia – możesz dalej pisać, zmiany zostaną wysłane po jego odzyskaniu.

---

## 5. Rozpoznawanie pisma

1. Napisz odręcznie wzór piórem, np. `x² + 2x = 3` lub ułamek.
2. Wybierz narzędzie **Rozpoznaj pismo** i obrysuj prostokątem napisany wzór.
3. W oknie **Rozpoznany wzór** zobaczysz rozpoznane znaki i podgląd. Znaki rozpoznane z niską pewnością
   są oznaczone na pomarańczowo – najedź/przytrzymaj, aby zobaczyć alternatywy. Popraw LaTeX, jeśli trzeba.
4. Zostaw zaznaczone **Usuń odręczne pismo**, aby zastąpić pismo wzorem, i kliknij **Wstaw wzór**.

Wskazówki: pisz znaki oddzielnie, wyraźnie; kreskę ułamkową rysuj szerzej niż licznik i mianownik;
potęgi pisz wyraźnie mniejsze i wyżej.

**Naucz aplikację swojego pisma**: kliknij **Naucz moje pismo…** (w oknie rozpoznawania lub w górnym pasku
przy narzędziu rozpoznawania), wybierz znak i narysuj go kilka razy → **Zapisz próbkę**.
Próbki są zapamiętywane na tym urządzeniu.

---

## 6. Skróty klawiszowe i gesty

| Skrót | Działanie |
|---|---|
| V / H / P / E / T | Zaznaczanie / przesuwanie / pióro / gumka / tekst |
| Ctrl+Z (⌘Z) | Cofnij |
| Ctrl+Shift+Z, Ctrl+Y | Ponów |
| Ctrl+A | Zaznacz wszystko |
| Ctrl+D | Duplikuj zaznaczenie |
| Ctrl+V (⌘V) | Wklej obraz ze schowka |
| Delete / Backspace | Usuń zaznaczenie |
| Esc | Anuluj zaznaczenie / zamknij okno |
| Spacja + przeciągnij | Przesuwanie widoku |
| Kółko myszy | Przewijanie; z Ctrl – powiększanie |
| Dwa palce | Przesuwanie i powiększanie (iPad, ekran dotykowy, gładzik) |
| Ctrl+Shift+D (⌘⇧D) | Pokaż / ukryj panel diagnostyki połączeń na tablicy |

---

## 7. Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---|---|
| „Kod jest nieprawidłowy, wygasł lub został wykorzystany” | Poproś korepetytorkę o nowy kod. |
| Przy uczestniku ikona „brak P2P – synchronizacja przez serwer” | Sieć blokuje połączenia bezpośrednie. Tablica działa normalnie, z nieco większym opóźnieniem. Administrator może skonfigurować serwer TURN. |
| Nie widzę zmian drugiej osoby | Sprawdź zieloną kropkę przy nazwie tablicy; odśwież stronę (F5). |
| Rysik nie reaguje na nacisk | W Windows włącz *Windows Ink* w sterowniku tabletu; w przeglądarce użyj Edge/Chrome. |
| Dłoń zostawia ślady na iPadzie | Włącz **tylko rysik** w górnym pasku. |
| „Zostałeś(-aś) usunięty(-a) z tablicy” | Korepetytorka usunęła Cię z tablicy – poproś o nowy kod. |
| Aplikacja nie łączy się z serwerem | Sprawdź, czy otwierasz adres `https://matdraw.weblance-devs.pl`, oraz połączenie z Internetem. |
| Nie pamiętam hasła | Aplikacja nie ma resetu hasła e‑mailem – skontaktuj się z administratorem (Weblance.pl). Znane hasło zmienisz sam(a) na stronie **Moje konto**. |
| Nie mogę wstawić obrazu ani wzoru CKE | Masz prawo tylko do podglądu – poproś korepetytorkę o prawo edycji. Obsługiwane formaty: PNG, JPEG, WebP, GIF, SVG. |
| Kursor drugiej osoby zniknął | Kursor znika po 5 s bez ruchu lub gdy mysz opuści tablicę – pojawi się przy następnym ruchu. |
| Chcę sprawdzić, czy połączenie działa poprawnie | Na tablicy kliknij ikonę pulsu (`Ctrl+Shift+D`): przy każdej osobie widać trasę – **P2P bezpośrednio** (najlepiej), **P2P przez TURN** (dobrze, przez przekaźnik) lub **brak P2P – przez serwer** (działa, większe opóźnienie) – oraz opóźnienie (RTT), przesłane dane i dziennik zdarzeń. **Kopiuj raport JSON** kopiuje komplet danych do wysłania administratorowi. |
| Czy działa STUN/TURN? | Na liście tablic kliknij **Diagnostyka** (`/dev`), potem **Uruchom wszystkie testy**: „srflx – STUN działa” i „relay – TURN działa” powinny mieć ✓, a w teście pętli TURN „TURN → klient” i „TURN ↔ TURN” – „OK”. Korepetytorka widzi tam też statystyki serwera i aktywne tablice. |
| Obraz „jest za duży” | Plik po kompresji przekracza ok. 3 MB (zdarza się przy dużych plikach SVG) – zapisz go jako PNG/JPEG. |
