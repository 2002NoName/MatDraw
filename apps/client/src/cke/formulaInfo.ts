/**
 * Opisy wzorów CKE dla strony „Wzory maturalne”: co to za wzór, kiedy i jak go użyć oraz przykład.
 * Tekst może zawierać wstawki matematyczne w `$…$` (LaTeX, renderowane przez KaTeX).
 */
export interface FormulaInfo {
  /** Co oznacza wzór i jego symbole. */
  about: string;
  /** Kiedy i jak z niego korzystać (typowe zadania, pułapki). */
  use: string;
  /** Rozwiązany przykład. */
  example: string;
}

export const CKE_INFO: Record<string, FormulaInfo> = {
  // 1. Wartość bezwzględna
  'abs-def': {
    about: 'Wartość bezwzględna (moduł) to odległość liczby od zera na osi liczbowej – zawsze jest nieujemna.',
    use: 'Przy rozwiązywaniu równań i nierówności z modułem rozpatruj osobno przypadek, gdy wyrażenie pod modułem jest nieujemne, i gdy jest ujemne.',
    example: '$|-7| = 7$, $|3| = 3$. Równanie $|x - 2| = 5$: $x - 2 = 5$ lub $x - 2 = -5$, więc $x = 7$ lub $x = -3$.',
  },
  'abs-sqrt': {
    about: 'Pierwiastek z kwadratu liczby to jej wartość bezwzględna, a nie sama liczba.',
    use: 'Przydaje się przy upraszczaniu wyrażeń z pierwiastkami – częsty błąd to zapis $\\sqrt{x^2} = x$, prawdziwy tylko dla $x \\ge 0$.',
    example: '$\\sqrt{(1 - \\sqrt{2})^2} = |1 - \\sqrt{2}| = \\sqrt{2} - 1$, bo $1 - \\sqrt{2} < 0$.',
  },
  'abs-ineq1': {
    about: 'Nierówność $|x - a| \\le r$ opisuje wszystkie liczby, których odległość od $a$ wynosi co najwyżej $r$ – to przedział domknięty o środku $a$.',
    use: 'Zamień nierówność z modułem na podwójną nierówność bez modułu. Dla $r < 0$ nierówność nie ma rozwiązań.',
    example: '$|x - 3| \\le 2 \\iff 1 \\le x \\le 5$, czyli $x \\in \\langle 1, 5 \\rangle$.',
  },
  'abs-ineq2': {
    about: 'Nierówność $|x - a| \\ge r$ opisuje liczby odległe od $a$ o co najmniej $r$ – suma dwóch przedziałów „na zewnątrz”.',
    use: 'Rozbij na dwie nierówności połączone słowem „lub”. Dla $r \\le 0$ spełnia ją każda liczba rzeczywista.',
    example: '$|x + 1| \\ge 4$: $x + 1 \\le -4$ lub $x + 1 \\ge 4$, więc $x \\in (-\\infty, -5\\rangle \\cup \\langle 3, \\infty)$.',
  },
  'abs-prop': {
    about: 'Moduł iloczynu i ilorazu to iloczyn i iloraz modułów; moduł sumy jest nie większy niż suma modułów (nierówność trójkąta).',
    use: 'Pozwala „rozdzielać” moduły przy mnożeniu i dzieleniu. Przy dodawaniu takiego rozdzielenia robić nie wolno.',
    example: '$|-3 \\cdot 4| = |-3| \\cdot |4| = 12$, a $|-3 + 4| = 1 \\le |-3| + |4| = 7$.',
  },

  // 2. Potęgi i pierwiastki
  'pow-def': {
    about: 'Potęga $a^n$ to iloczyn $n$ czynników równych $a$. Każda liczba różna od zera podniesiona do potęgi $0$ daje $1$.',
    use: 'Podstawa wszystkich obliczeń na potęgach; wyrażenie $0^0$ jest nieokreślone.',
    example: '$2^5 = 2 \\cdot 2 \\cdot 2 \\cdot 2 \\cdot 2 = 32$, $(-3)^2 = 9$, $(-3)^3 = -27$, $7^0 = 1$.',
  },
  'pow-neg': {
    about: 'Potęga o wykładniku ujemnym to odwrotność potęgi o wykładniku dodatnim.',
    use: 'Zamieniaj ujemne wykładniki na ułamki (lub odwrotnie), aby uprościć wyrażenie lub porównać liczby.',
    example: '$2^{-3} = \\frac{1}{2^3} = \\frac{1}{8}$, $\\left(\\frac{2}{3}\\right)^{-2} = \\left(\\frac{3}{2}\\right)^2 = \\frac{9}{4}$.',
  },
  'pow-frac': {
    about: 'Wykładnik wymierny $\\frac{m}{n}$ oznacza pierwiastek stopnia $n$ z potęgi $m$ (dla dodatniej podstawy).',
    use: 'Zamień pierwiastki na potęgi, a potem stosuj działania na potęgach – to najszybszy sposób upraszczania wyrażeń z pierwiastkami.',
    example: '$8^{\\frac{2}{3}} = \\sqrt[3]{8^2} = (\\sqrt[3]{8})^2 = 2^2 = 4$, $\\ 16^{-\\frac{1}{2}} = \\frac{1}{\\sqrt{16}} = \\frac{1}{4}$.',
  },
  'pow-rules': {
    about: 'Przy mnożeniu potęg o tej samej podstawie dodajemy wykładniki, przy dzieleniu – odejmujemy, przy potęgowaniu potęgi – mnożymy.',
    use: 'Sprowadzaj liczby do wspólnej podstawy (np. $4 = 2^2$, $27 = 3^3$), a dopiero potem stosuj prawa działań.',
    example: '$\\frac{4^3 \\cdot 2^5}{8^2} = \\frac{2^6 \\cdot 2^5}{2^6} = 2^5 = 32$.',
  },
  'root-def': {
    about: 'Pierwiastek arytmetyczny stopnia $n$ z liczby nieujemnej $a$ to taka nieujemna liczba $b$, że $b^n = a$.',
    use: 'Sprawdzaj, czy liczba podpierwiastkowa jest nieujemna (dziedzina!). Wynik pierwiastka arytmetycznego jest zawsze nieujemny.',
    example: '$\\sqrt{49} = 7$ (a nie $\\pm 7$), $\\sqrt[3]{125} = 5$, $\\sqrt[4]{81} = 3$.',
  },
  'root-odd': {
    about: 'Pierwiastek stopnia nieparzystego istnieje także z liczby ujemnej i jest liczbą ujemną.',
    use: 'Wyciągnij minus przed pierwiastek i oblicz pierwiastek z liczby dodatniej.',
    example: '$\\sqrt[3]{-27} = -\\sqrt[3]{27} = -3$, $\\sqrt[5]{-32} = -2$.',
  },
  'root-rules': {
    about: 'Pierwiastek iloczynu (ilorazu) jest iloczynem (ilorazem) pierwiastków tego samego stopnia.',
    use: 'Służy do wyłączania czynnika przed pierwiastek i usuwania niewymierności z mianownika. Pierwiastka z sumy tak rozdzielić nie wolno.',
    example: '$\\sqrt{72} = \\sqrt{36 \\cdot 2} = 6\\sqrt{2}$, $\\ \\frac{6}{\\sqrt{3}} = \\frac{6\\sqrt{3}}{3} = 2\\sqrt{3}$.',
  },

  // 3. Logarytmy
  'log-def': {
    about: 'Logarytm $\\log_a c$ to wykładnik, do którego trzeba podnieść podstawę $a$, aby otrzymać $c$.',
    use: 'Zamieniaj logarytm na równanie potęgowe. Pamiętaj o założeniach: $a > 0$, $a \\ne 1$, $c > 0$.',
    example: '$\\log_2 32 = 5$, bo $2^5 = 32$; $\\ \\log_3 \\frac{1}{9} = -2$, bo $3^{-2} = \\frac{1}{9}$.',
  },
  'log-basic': {
    about: 'Logarytm z jedynki jest zerem, logarytm z podstawy jest jedynką, a podstawa podniesiona do logarytmu daje liczbę logarytmowaną.',
    use: 'Szybkie upraszczanie wyrażeń bez kalkulatora.',
    example: '$\\log_7 1 = 0$, $\\log_5 5 = 1$, $3^{\\log_3 8} = 8$.',
  },
  'log-sum': {
    about: 'Logarytm iloczynu to suma logarytmów, a logarytm ilorazu – różnica logarytmów (przy tej samej podstawie).',
    use: 'Łącz kilka logarytmów w jeden albo rozbijaj logarytm złożonego wyrażenia na prostsze.',
    example: '$\\log_6 4 + \\log_6 9 = \\log_6 36 = 2$, $\\ \\log_2 40 - \\log_2 5 = \\log_2 8 = 3$.',
  },
  'log-pow': {
    about: 'Wykładnik potęgi pod logarytmem można wyciągnąć przed logarytm jako czynnik.',
    use: 'Przydatne przy logarytmach z pierwiastków i potęg oraz w równaniach wykładniczych.',
    example: '$\\log_3 \\sqrt{3} = \\log_3 3^{\\frac{1}{2}} = \\frac{1}{2}$, $\\ 2\\log 5 + \\log 4 = \\log 25 + \\log 4 = \\log 100 = 2$.',
  },
  'log-change': {
    about: 'Wzór pozwala zamienić logarytm o dowolnej podstawie na iloraz logarytmów o innej, wygodniejszej podstawie.',
    use: 'Stosuj, gdy w zadaniu występują logarytmy o różnych podstawach albo gdy kalkulator liczy tylko $\\log$ dziesiętny.',
    example: '$\\log_4 8 = \\frac{\\log_2 8}{\\log_2 4} = \\frac{3}{2}$.',
  },
  'log-dec': {
    about: 'Logarytm dziesiętny to logarytm o podstawie $10$; zapisuje się go bez podstawy.',
    use: 'Używany w zadaniach praktycznych (skala pH, decybele) i przy obliczeniach kalkulatorem.',
    example: '$\\log 1000 = 3$, $\\log 0{,}01 = -2$.',
  },

  // 4. Silnia, symbol Newtona
  fact: {
    about: 'Silnia $n!$ to iloczyn kolejnych liczb naturalnych od $1$ do $n$; z definicji $0! = 1$.',
    use: 'Liczba ustawień $n$ elementów w ciąg. Przy dzieleniu silni skracaj wspólne czynniki, zamiast liczyć je w całości.',
    example: '$5! = 120$, $\\ \\frac{10!}{8!} = 9 \\cdot 10 = 90$.',
  },
  binom: {
    about: 'Symbol Newtona $\\binom{n}{k}$ („$n$ po $k$”) to liczba sposobów wyboru $k$ elementów z $n$ bez względu na kolejność.',
    use: 'Kombinatoryka (kombinacje), schemat Bernoulliego, dwumian Newtona. Licz, skracając silnie.',
    example: '$\\binom{5}{2} = \\frac{5!}{2! \\cdot 3!} = \\frac{4 \\cdot 5}{2} = 10$ – tyle jest par z 5 osób.',
  },
  'binom-prop': {
    about: 'Symetria: wybrać $k$ elementów to to samo, co wybrać $n - k$ elementów do pominięcia. Druga równość tworzy trójkąt Pascala.',
    use: 'Upraszczanie obliczeń (np. $\\binom{20}{18} = \\binom{20}{2}$) i dowody tożsamości.',
    example: '$\\binom{20}{18} = \\binom{20}{2} = 190$, $\\ \\binom{4}{1} + \\binom{4}{2} = 4 + 6 = 10 = \\binom{5}{2}$.',
  },
  'binom-thm': {
    about: 'Wzór dwumianowy Newtona rozwija dowolną potęgę naturalną sumy dwóch składników; współczynniki to symbole Newtona.',
    use: 'Znajdowanie konkretnego wyrazu rozwinięcia lub współczynnika przy danej potędze $x$.',
    example: '$(x + 2)^3 = x^3 + 3 \\cdot x^2 \\cdot 2 + 3 \\cdot x \\cdot 4 + 8 = x^3 + 6x^2 + 12x + 8$.',
  },

  // 5. Wzory skróconego mnożenia
  'sq-sum': {
    about: 'Kwadrat sumy (różnicy) dwóch wyrażeń: kwadrat pierwszego, plus (minus) podwojony iloczyn, plus kwadrat drugiego.',
    use: 'Rozwijanie nawiasów, sprowadzanie trójmianu do postaci kanonicznej, obliczenia w pamięci.',
    example: '$(x - 3)^2 = x^2 - 6x + 9$, $\\ 51^2 = (50 + 1)^2 = 2500 + 100 + 1 = 2601$.',
  },
  'cube-sum': {
    about: 'Rozwinięcie sześcianu sumy lub różnicy – współczynniki $1, 3, 3, 1$.',
    use: 'Rozwijanie wyrażeń w trzeciej potędze i upraszczanie wyrażeń algebraicznych.',
    example: '$(2x + 1)^3 = 8x^3 + 12x^2 + 6x + 1$.',
  },
  'sq-diff': {
    about: 'Różnica kwadratów rozkłada się na iloczyn różnicy i sumy.',
    use: 'Rozkład na czynniki (np. w równaniach), usuwanie niewymierności z mianownika, szybkie mnożenie.',
    example: '$x^2 - 25 = (x - 5)(x + 5)$, $\\ \\frac{1}{\\sqrt{3} - 1} = \\frac{\\sqrt{3} + 1}{3 - 1} = \\frac{\\sqrt{3} + 1}{2}$.',
  },
  'cube-diff': {
    about: 'Sumę i różnicę sześcianów można rozłożyć na iloczyn dwumianu i trójmianu.',
    use: 'Rozkład wielomianów na czynniki i usuwanie niewymierności z pierwiastkami trzeciego stopnia.',
    example: '$x^3 - 8 = (x - 2)(x^2 + 2x + 4)$, więc jedynym pierwiastkiem rzeczywistym $x^3 = 8$ jest $x = 2$.',
  },
  'pow-diff': {
    about: 'Uogólnienie różnicy kwadratów i sześcianów na dowolną potęgę naturalną $n$.',
    use: 'Rozkład wielomianów, dowody podzielności (np. $a^n - b^n$ dzieli się przez $a - b$).',
    example: '$x^4 - 1 = (x - 1)(x^3 + x^2 + x + 1)$; zatem $7^4 - 1$ dzieli się przez $6$.',
  },

  // 6. Ciągi
  'arith-n': {
    about: 'W ciągu arytmetycznym każdy wyraz powstaje z poprzedniego przez dodanie stałej różnicy $r$.',
    use: 'Wyznaczanie dowolnego wyrazu albo $a_1$ i $r$ z dwóch znanych wyrazów (układ równań).',
    example: '$a_1 = 3$, $r = 4$: $a_{10} = 3 + 9 \\cdot 4 = 39$. Gdy $a_2 = 5$ i $a_6 = 17$: $4r = 12$, więc $r = 3$.',
  },
  'arith-s': {
    about: 'Suma $n$ początkowych wyrazów ciągu arytmetycznego – średnia pierwszego i ostatniego wyrazu razy liczba wyrazów.',
    use: 'Pierwszej postaci użyj, gdy znasz $a_n$; drugiej – gdy znasz tylko $a_1$ i $r$.',
    example: 'Suma liczb od $1$ do $100$: $S_{100} = \\frac{1 + 100}{2} \\cdot 100 = 5050$.',
  },
  'arith-mid': {
    about: 'Każdy wyraz (poza pierwszym) ciągu arytmetycznego jest średnią arytmetyczną sąsiadów.',
    use: 'Typowe zadanie: „liczby $x$, $y$, $z$ tworzą ciąg arytmetyczny” – zapisz $2y = x + z$.',
    example: 'Liczby $2$, $x$, $14$ tworzą ciąg arytmetyczny: $x = \\frac{2 + 14}{2} = 8$.',
  },
  'geom-n': {
    about: 'W ciągu geometrycznym każdy wyraz powstaje z poprzedniego przez pomnożenie przez stały iloraz $q$.',
    use: 'Wyznaczanie wyrazów; z dwóch znanych wyrazów dzielenie stronami daje $q$.',
    example: '$a_1 = 3$, $q = 2$: $a_5 = 3 \\cdot 2^4 = 48$.',
  },
  'geom-s': {
    about: 'Suma $n$ początkowych wyrazów ciągu geometrycznego; dla $q = 1$ wszystkie wyrazy są równe.',
    use: 'Zadania o wielokrotnym podwajaniu, ratach, rozmnażaniu bakterii.',
    example: '$1 + 2 + 4 + \\ldots + 512$: $a_1 = 1$, $q = 2$, $n = 10$, $S_{10} = \\frac{1 - 2^{10}}{1 - 2} = 1023$.',
  },
  'geom-mid': {
    about: 'Kwadrat wyrazu ciągu geometrycznego jest równy iloczynowi wyrazów sąsiednich.',
    use: 'Zadania typu „liczby $x$, $y$, $z$ tworzą ciąg geometryczny” – zapisz $y^2 = x \\cdot z$.',
    example: 'Liczby $4$, $x$, $9$ tworzą ciąg geometryczny o wyrazach dodatnich: $x^2 = 36$, więc $x = 6$.',
  },
  'geom-inf': {
    about: 'Suma wszystkich (nieskończenie wielu) wyrazów ciągu geometrycznego istnieje tylko dla $|q| < 1$.',
    use: 'Sprawdź najpierw warunek zbieżności $|q| < 1$. Zamiana ułamka okresowego na zwykły, pola nieskończonych ciągów figur.',
    example: '$0{,}(3) = 0{,}3 + 0{,}03 + \\ldots = \\frac{0{,}3}{1 - 0{,}1} = \\frac{1}{3}$.',
  },
  interest: {
    about: '$K_n$ to kapitał po $n$ okresach oprocentowania, gdy odsetki dopisuje się do kapitału (procent składany); $K$ – kapitał początkowy, $p$ – oprocentowanie w procentach na okres.',
    use: 'Lokaty, kredyty, wzrost lub spadek procentowy powtarzany wiele razy. Przy kapitalizacji co miesiąc dziel roczne $p$ przez $12$, a $n$ to liczba miesięcy.',
    example: '$1000$ zł na $5\\%$ rocznie przez $2$ lata: $K_2 = 1000 \\cdot 1{,}05^2 = 1102{,}50$ zł.',
  },

  // 7. Funkcja liniowa i kwadratowa
  lin: {
    about: '$a$ to współczynnik kierunkowy (tangens kąta nachylenia prostej do osi $OX$), $b$ – punkt przecięcia z osią $OY$.',
    use: '$a > 0$ – funkcja rosnąca, $a < 0$ – malejąca, $a = 0$ – stała. Z dwóch punktów wykresu wyznaczysz $a$ i $b$ układem równań.',
    example: 'Prosta przez $(0, 1)$ i $(2, 5)$: $b = 1$, $a = \\frac{5 - 1}{2 - 0} = 2$, więc $f(x) = 2x + 1$.',
  },
  'quad-forms': {
    about: 'Ta sama funkcja kwadratowa w postaci ogólnej (widać $a$, $b$, $c$) i kanonicznej (widać wierzchołek $(p, q)$).',
    use: 'Postać kanoniczna od razu daje wierzchołek, zbiór wartości i przedziały monotoniczności.',
    example: '$f(x) = x^2 - 4x + 1 = (x - 2)^2 - 3$, więc $W = (2, -3)$ i zbiór wartości to $\\langle -3, \\infty)$.',
  },
  'quad-vertex': {
    about: 'Wierzchołek paraboli $W = (p, q)$ – dla $a > 0$ najniższy, dla $a < 0$ najwyższy punkt wykresu.',
    use: 'Zadania optymalizacyjne (największe pole, najmniejszy koszt) – wartość ekstremalna to $q$, osiągana dla $x = p$.',
    example: '$f(x) = -x^2 + 6x$: $p = \\frac{-6}{-2} = 3$, $q = f(3) = 9$ – największa wartość funkcji to $9$.',
  },
  'quad-delta': {
    about: 'Wyróżnik (delta) decyduje o liczbie miejsc zerowych: $\\Delta > 0$ – dwa, $\\Delta = 0$ – jedno, $\\Delta < 0$ – brak.',
    use: 'Pierwszy krok przy rozwiązywaniu równań i nierówności kwadratowych oraz w zadaniach z parametrem.',
    example: '$x^2 - 5x + 6 = 0$: $\\Delta = 25 - 24 = 1 > 0$ – dwa rozwiązania.',
  },
  'quad-roots': {
    about: 'Wzory na pierwiastki równania kwadratowego $ax^2 + bx + c = 0$; dla $\\Delta = 0$ oba wzory dają ten sam pierwiastek $x_0 = \\frac{-b}{2a}$.',
    use: 'Policz najpierw $\\Delta$ i $\\sqrt{\\Delta}$, potem podstaw. W nierównościach naszkicuj parabolę przez wyznaczone pierwiastki.',
    example: '$x^2 - 5x + 6 = 0$: $\\sqrt{\\Delta} = 1$, $x_1 = \\frac{5 - 1}{2} = 2$, $x_2 = \\frac{5 + 1}{2} = 3$.',
  },
  'quad-fact': {
    about: 'Postać iloczynowa pokazuje miejsca zerowe funkcji kwadratowej.',
    use: 'Gdy znasz miejsca zerowe i jeden punkt wykresu, łatwo wyznaczysz wzór funkcji. Ułatwia też rozwiązywanie nierówności.',
    example: 'Miejsca zerowe $1$ i $4$, wykres przechodzi przez $(0, 8)$: $8 = a(0 - 1)(0 - 4) = 4a$, więc $f(x) = 2(x - 1)(x - 4)$.',
  },
  viete: {
    about: 'Wzory Viète’a wiążą sumę i iloczyn pierwiastków równania kwadratowego z jego współczynnikami (gdy $\\Delta \\ge 0$).',
    use: 'Obliczanie wyrażeń typu $x_1^2 + x_2^2$ lub $\\frac{1}{x_1} + \\frac{1}{x_2}$ bez wyznaczania pierwiastków; zadania z parametrem.',
    example: '$x^2 - 7x + 10 = 0$: $x_1 + x_2 = 7$, $x_1 x_2 = 10$, więc $x_1^2 + x_2^2 = 7^2 - 2 \\cdot 10 = 29$.',
  },

  // 8. Trygonometria
  'trig-def': {
    about: 'W trójkącie prostokątnym: $a$ – przyprostokątna naprzeciw kąta $\\alpha$, $b$ – przyprostokątna przy kącie $\\alpha$, $c$ – przeciwprostokątna.',
    use: 'Obliczanie boków i kątów trójkąta prostokątnego. Wybierz funkcję, która łączy dany bok z szukanym.',
    example: 'Przeciwprostokątna $c = 10$, $\\alpha = 30^\\circ$: $a = c \\sin 30^\\circ = 10 \\cdot \\frac{1}{2} = 5$.',
  },
  'trig-unit': {
    about: 'Definicja dla dowolnego kąta: $(x, y)$ to punkt na końcowym ramieniu kąta, $r$ – jego odległość od początku układu.',
    use: 'Wyznaczanie funkcji trygonometrycznych kątów rozwartych i znaków funkcji w ćwiartkach.',
    example: 'Punkt $(-3, 4)$: $r = 5$, $\\sin \\alpha = \\frac{4}{5}$, $\\cos \\alpha = -\\frac{3}{5}$, $\\tg \\alpha = -\\frac{4}{3}$.',
  },
  'trig-one': {
    about: 'Jedynka trygonometryczna – suma kwadratów sinusa i cosinusa tego samego kąta jest zawsze równa $1$.',
    use: 'Znając jedną funkcję, obliczysz drugą. Znak wyniku ustal na podstawie ćwiartki, w której leży kąt.',
    example: '$\\sin \\alpha = \\frac{3}{5}$, $\\alpha$ ostry: $\\cos^2 \\alpha = 1 - \\frac{9}{25} = \\frac{16}{25}$, więc $\\cos \\alpha = \\frac{4}{5}$.',
  },
  'trig-tg': {
    about: 'Tangens to iloraz sinusa przez cosinus tego samego kąta.',
    use: 'Razem z jedynką trygonometryczną pozwala wyznaczyć wszystkie funkcje z jednej danej.',
    example: '$\\sin \\alpha = \\frac{3}{5}$, $\\cos \\alpha = \\frac{4}{5}$: $\\tg \\alpha = \\frac{3}{5} : \\frac{4}{5} = \\frac{3}{4}$.',
  },
  'trig-reduce': {
    about: 'Wzory redukcyjne sprowadzają funkcje kątów rozwartych lub dopełniających do kątów ostrych.',
    use: 'Obliczanie wartości dla kątów większych niż $90^\\circ$ i upraszczanie wyrażeń, np. w twierdzeniu cosinusów dla kąta rozwartego.',
    example: '$\\sin 150^\\circ = \\sin(180^\\circ - 30^\\circ) = \\sin 30^\\circ = \\frac{1}{2}$, $\\ \\cos 120^\\circ = -\\cos 60^\\circ = -\\frac{1}{2}$.',
  },
  'trig-values': {
    about: 'Dokładne wartości funkcji trygonometrycznych dla najczęściej używanych kątów; $\\tg 90^\\circ$ nie istnieje.',
    use: 'Gdy kąt jest „ładny” ($30^\\circ$, $45^\\circ$, $60^\\circ$), używaj dokładnych wartości z pierwiastkami zamiast przybliżeń z tablicy.',
    example: 'Przekątna kwadratu o boku $4$ tworzy z bokiem kąt $45^\\circ$: $d = \\frac{4}{\\cos 45^\\circ} = \\frac{4}{\\frac{\\sqrt{2}}{2}} = 4\\sqrt{2}$.',
  },
  'trig-values-obtuse': {
    about: 'Dokładne wartości dla typowych kątów rozwartych – wynikają ze wzorów redukcyjnych $\\sin(180^\\circ - \\alpha) = \\sin \\alpha$ i $\\cos(180^\\circ - \\alpha) = -\\cos \\alpha$.',
    use: 'Twierdzenie cosinusów i pole trójkąta z kątem rozwartym. Cosinus i tangens kąta rozwartego są ujemne.',
    example: 'Trójkąt o bokach $3$ i $5$ z kątem $120^\\circ$ między nimi: $c^2 = 9 + 25 - 2 \\cdot 15 \\cdot \\left(-\\frac{1}{2}\\right) = 49$, $c = 7$.',
  },
  'trig-sum': {
    about: 'Wzory na sinus i cosinus sumy oraz różnicy dwóch kątów.',
    use: 'Obliczanie dokładnych wartości dla kątów typu $15^\\circ$, $75^\\circ$, $105^\\circ$ oraz przekształcanie równań trygonometrycznych.',
    example: '$\\sin 75^\\circ = \\sin(45^\\circ + 30^\\circ) = \\frac{\\sqrt{2}}{2} \\cdot \\frac{\\sqrt{3}}{2} + \\frac{\\sqrt{2}}{2} \\cdot \\frac{1}{2} = \\frac{\\sqrt{6} + \\sqrt{2}}{4}$.',
  },
  'trig-tgsum': {
    about: 'Tangens sumy i różnicy kątów wyrażony przez tangensy tych kątów.',
    use: 'Obliczanie tangensa kąta między prostymi i wartości dla kątów złożonych.',
    example: '$\\tg 15^\\circ = \\tg(45^\\circ - 30^\\circ) = \\frac{1 - \\frac{\\sqrt{3}}{3}}{1 + \\frac{\\sqrt{3}}{3}} = 2 - \\sqrt{3}$.',
  },
  'trig-double': {
    about: 'Funkcje kąta podwojonego wyrażone przez funkcje kąta $\\alpha$; cosinus ma trzy równoważne postacie.',
    use: 'Równania trygonometryczne (sprowadzanie do jednej funkcji) i obliczanie $\\sin 2\\alpha$ z danych o $\\alpha$.',
    example: '$\\sin \\alpha = \\frac{3}{5}$, $\\cos \\alpha = \\frac{4}{5}$: $\\sin 2\\alpha = 2 \\cdot \\frac{3}{5} \\cdot \\frac{4}{5} = \\frac{24}{25}$.',
  },
  'trig-sumprod': {
    about: 'Zamiana sumy lub różnicy sinusów (cosinusów) na iloczyn.',
    use: 'Rozwiązywanie równań typu $\\sin 3x + \\sin x = 0$ – po zamianie na iloczyn przyrównujesz każdy czynnik do zera.',
    example: '$\\sin 3x + \\sin x = 2 \\sin 2x \\cos x = 0 \\iff \\sin 2x = 0 \\ \\lor \\ \\cos x = 0$.',
  },
  'trig-period': {
    about: 'Sinus i cosinus są okresowe z okresem $2\\pi$ ($360^\\circ$), a tangens – z okresem $\\pi$ ($180^\\circ$); $k$ jest liczbą całkowitą.',
    use: 'Zapisywanie wszystkich rozwiązań równań trygonometrycznych i redukcja dużych kątów.',
    example: '$\\sin 390^\\circ = \\sin(30^\\circ + 360^\\circ) = \\frac{1}{2}$. Równanie $\\tg x = 1$: $x = \\frac{\\pi}{4} + k\\pi$, $k \\in \\mathbb{Z}$.',
  },

  // 9. Planimetria
  'tri-area': {
    about: 'Pole trójkąta: połowa iloczynu boku i wysokości opuszczonej na ten bok albo połowa iloczynu dwóch boków i sinusa kąta między nimi.',
    use: 'Postać z sinusem stosuj, gdy znasz dwa boki i kąt między nimi; postać z wysokością – gdy znasz bok i wysokość.',
    example: 'Boki $6$ i $8$, kąt $30^\\circ$ między nimi: $P = \\frac{1}{2} \\cdot 6 \\cdot 8 \\cdot \\frac{1}{2} = 12$.',
  },
  heron: {
    about: 'Wzór Herona daje pole trójkąta z samych długości boków; $p$ to połowa obwodu.',
    use: 'Gdy znasz tylko trzy boki. Po obliczeniu pola wyznaczysz też wysokość albo promienie okręgów.',
    example: 'Boki $5$, $6$, $7$: $p = 9$, $P = \\sqrt{9 \\cdot 4 \\cdot 3 \\cdot 2} = \\sqrt{216} = 6\\sqrt{6}$.',
  },
  'tri-rR': {
    about: '$R$ – promień okręgu opisanego na trójkącie, $r$ – promień okręgu wpisanego, $p$ – połowa obwodu.',
    use: 'Wyznaczanie promieni: $R = \\frac{abc}{4P}$, $r = \\frac{P}{p}$.',
    example: 'Trójkąt $3, 4, 5$: $P = 6$, $p = 6$, więc $r = 1$ i $R = \\frac{60}{24} = 2{,}5$.',
  },
  pyth: {
    about: 'W trójkącie prostokątnym suma kwadratów przyprostokątnych równa się kwadratowi przeciwprostokątnej $c$.',
    use: 'Obliczanie trzeciego boku trójkąta prostokątnego; twierdzenie odwrotne sprawdza, czy trójkąt jest prostokątny.',
    example: 'Przyprostokątne $5$ i $12$: $c = \\sqrt{25 + 144} = 13$.',
  },
  'right-tri': {
    about: '$h_c$ – wysokość opuszczona na przeciwprostokątną, $D$ – jej spodek. Środek okręgu opisanego leży w środku przeciwprostokątnej.',
    use: 'Zadania z wysokością w trójkącie prostokątnym oraz z okręgami wpisanym i opisanym.',
    example: 'Trójkąt $6, 8, 10$: $h_c = \\frac{48}{10} = 4{,}8$, $R = 5$, $r = \\frac{6 + 8 - 10}{2} = 2$.',
  },
  equi: {
    about: 'Wysokość, pole i promienie okręgów trójkąta równobocznego o boku $a$. Środki obu okręgów pokrywają się i dzielą wysokość w stosunku $2 : 1$.',
    use: 'Częste w zadaniach z ostrosłupami prawidłowymi trójkątnymi i czworościanem foremnym.',
    example: '$a = 6$: $h = 3\\sqrt{3}$, $P = 9\\sqrt{3}$, $R = 2\\sqrt{3}$, $r = \\sqrt{3}$.',
  },
  sines: {
    about: 'W dowolnym trójkącie stosunek boku do sinusa przeciwległego kąta jest stały i równy średnicy okręgu opisanego ($2R$).',
    use: 'Gdy znasz bok i kąt naprzeciw niego oraz drugi kąt lub bok; także do obliczenia $R$.',
    example: '$a = 10$, $\\alpha = 30^\\circ$: $2R = \\frac{10}{\\frac{1}{2}} = 20$, więc $R = 10$.',
  },
  cosines: {
    about: 'Uogólnienie twierdzenia Pitagorasa na dowolny trójkąt; $\\gamma$ – kąt między bokami $a$ i $b$, leżący naprzeciw boku $c$.',
    use: 'Gdy znasz dwa boki i kąt między nimi (szukasz trzeciego boku) albo trzy boki (szukasz kąta).',
    example: '$a = 5$, $b = 8$, $\\gamma = 60^\\circ$: $c^2 = 25 + 64 - 2 \\cdot 40 \\cdot \\frac{1}{2} = 49$, $c = 7$.',
  },
  'quad-areas': {
    about: 'Pola czworokątów: $h$ – wysokość, $d_1$, $d_2$ – przekątne, $\\varphi$ – kąt między przekątnymi, $a$, $b$ w trapezie – podstawy.',
    use: 'Wybierz wzór do danych: boki i kąt, przekątne albo podstawy i wysokość.',
    example: 'Romb o przekątnych $6$ i $8$: $P = \\frac{1}{2} \\cdot 6 \\cdot 8 = 24$. Trapez o podstawach $7$ i $3$ i wysokości $4$: $P = 20$.',
  },
  inscribed: {
    about: 'Warunki istnienia okręgu: w czworokąt wpisany w okrąg sumy przeciwległych kątów wynoszą $180^\\circ$, a w czworokąt opisany na okręgu sumy przeciwległych boków są równe.',
    use: 'Sprawdzanie, czy czworokąt da się wpisać w okrąg lub opisać na okręgu, i wyznaczanie brakujących kątów lub boków.',
    example: 'Trapez równoramienny o podstawach $8$ i $2$ opisany na okręgu: $2c = 8 + 2$, więc ramię $c = 5$.',
  },
  circle: {
    about: '$P$ – pole koła, $L$ – obwód (długość okręgu) o promieniu $r$.',
    use: 'Podstawowe obliczenia na kołach; wynik zostaw z $\\pi$, chyba że zadanie każe przybliżyć.',
    example: '$r = 3$: $P = 9\\pi$, $L = 6\\pi \\approx 18{,}85$.',
  },
  sector: {
    about: 'Pole wycinka i długość łuku to taka część pola koła i obwodu, jaką kąt środkowy $\\alpha$ stanowi z $360^\\circ$.',
    use: 'Zadania z wycinkami, zegarami i powierzchnią boczną stożka (rozwinięcie to wycinek koła).',
    example: '$r = 6$, $\\alpha = 60^\\circ$: $P = 36\\pi \\cdot \\frac{1}{6} = 6\\pi$, $l = 12\\pi \\cdot \\frac{1}{6} = 2\\pi$.',
  },
  angles: {
    about: 'Kąt środkowy jest dwa razy większy od kąta wpisanego opartego na tym samym łuku. Kąt wpisany oparty na półokręgu jest prosty.',
    use: 'Wyznaczanie kątów w okręgu i dowody geometryczne.',
    example: 'Kąt wpisany ma $35^\\circ$, więc kąt środkowy oparty na tym samym łuku ma $70^\\circ$.',
  },
  thales: {
    about: 'Twierdzenie Talesa: proste równoległe przecinające ramiona kąta wyznaczają na nich odcinki proporcjonalne.',
    use: 'Obliczanie długości odcinków przy prostych równoległych i w trójkątach podobnych.',
    example: '$|OA| = 4$, $|AA\'| = 6$, $|OB| = 6$: $|BB\'| = \\frac{6 \\cdot 6}{4} = 9$.',
  },
  similar: {
    about: 'W figurach podobnych w skali $k$ długości (i obwody) mają się jak $k$, a pola – jak $k^2$.',
    use: 'Skala map i planów, trójkąty podobne. W bryłach podobnych objętości mają się jak $k^3$.',
    example: 'Trójkąt powiększono w skali $3$: jego pole wzrośnie $9$ razy, np. z $5$ do $45$.',
  },
  polygon: {
    about: 'Suma kątów wewnętrznych $n$-kąta wypukłego i liczba jego przekątnych.',
    use: 'Kąt wielokąta foremnego to $\\frac{(n - 2) \\cdot 180^\\circ}{n}$.',
    example: 'Sześciokąt: $S = 4 \\cdot 180^\\circ = 720^\\circ$ (foremny ma kąty po $120^\\circ$), $d = \\frac{6 \\cdot 3}{2} = 9$.',
  },

  // 10. Geometria analityczna
  dist: {
    about: 'Długość odcinka o końcach $A = (x_A, y_A)$ i $B = (x_B, y_B)$ – wynika z twierdzenia Pitagorasa.',
    use: 'Obwody figur, sprawdzanie, czy trójkąt jest równoramienny lub prostokątny, promień okręgu.',
    example: '$A = (1, 2)$, $B = (4, 6)$: $|AB| = \\sqrt{9 + 16} = 5$.',
  },
  mid: {
    about: 'Współrzędne środka odcinka to średnie arytmetyczne współrzędnych końców.',
    use: 'Środek okręgu o danej średnicy, przekątne równoległoboku (przecinają się w połowie), symetralne.',
    example: '$A = (-2, 3)$, $B = (6, 7)$: $S = (2, 5)$.',
  },
  vec: {
    about: 'Wektor $\\overrightarrow{AB}$ ma współrzędne „koniec minus początek”; długość wektora liczy się jak długość odcinka.',
    use: 'Przesunięcia, sprawdzanie równoległości (wektory proporcjonalne), wyznaczanie brakującego wierzchołka równoległoboku.',
    example: '$A = (1, 1)$, $B = (4, 5)$: $\\overrightarrow{AB} = [3, 4]$, $|\\overrightarrow{AB}| = 5$.',
  },
  'line-forms': {
    about: 'Równanie ogólne prostej opisuje każdą prostą (także pionową $x = c$); postać kierunkowa – każdą prostą niepionową.',
    use: 'Postać ogólna jest potrzebna we wzorze na odległość punktu od prostej; kierunkowa – do badania nachylenia i równoległości.',
    example: '$2x - y + 3 = 0 \\iff y = 2x + 3$ (współczynnik kierunkowy $2$).',
  },
  'line-2pts': {
    about: 'Równanie prostej przechodzącej przez dwa różne punkty $A$ i $B$.',
    use: 'Bez dzielenia, więc działa też dla prostych pionowych. Alternatywnie: $a = \\frac{y_B - y_A}{x_B - x_A}$, a potem $b$ z jednego punktu.',
    example: '$A = (1, 2)$, $B = (3, 6)$: $(y - 2) \\cdot 2 - 4(x - 1) = 0 \\iff y = 2x$.',
  },
  'line-pt-slope': {
    about: 'Prosta o współczynniku kierunkowym $a$ przechodząca przez punkt $(x_0, y_0)$.',
    use: 'Prosta równoległa lub prostopadła do danej przez dany punkt oraz styczna do wykresu.',
    example: 'Prosta równoległa do $y = 3x - 1$ przez $(2, 5)$: $y = 3(x - 2) + 5 = 3x - 1$ – to ta sama prosta, bo punkt na niej leży.',
  },
  parallel: {
    about: 'Proste $y = a_1 x + b_1$ i $y = a_2 x + b_2$ są równoległe, gdy mają równe współczynniki kierunkowe, a prostopadłe, gdy iloczyn współczynników wynosi $-1$.',
    use: 'Wyznaczanie prostych równoległych i prostopadłych, wysokości trójkąta, symetralnych.',
    example: 'Prostopadła do $y = 2x + 1$ ma $a = -\\frac{1}{2}$; przez $(0, 3)$: $y = -\\frac{1}{2}x + 3$.',
  },
  'pt-line': {
    about: 'Odległość punktu $(x_0, y_0)$ od prostej $Ax + By + C = 0$ (długość odcinka prostopadłego).',
    use: 'Wysokość trójkąta, promień okręgu stycznego do prostej, odległość między prostymi równoległymi. Prostą zapisz w postaci ogólnej.',
    example: 'Punkt $(1, 2)$ i prosta $3x + 4y - 1 = 0$: $d = \\frac{|3 + 8 - 1|}{5} = 2$.',
  },
  'tri-coords': {
    about: 'Pole trójkąta o wierzchołkach $A$, $B$, $C$ obliczone bezpośrednio ze współrzędnych.',
    use: 'Szybka alternatywa dla „podstawa razy wysokość”; pole $0$ oznacza, że punkty są współliniowe.',
    example: '$A = (0, 0)$, $B = (4, 0)$, $C = (1, 3)$: $P = \\frac{1}{2} |4 \\cdot 3 - 0 \\cdot 1| = 6$.',
  },
  'circle-eq': {
    about: 'Okrąg o środku $S = (a, b)$ i promieniu $r$ – postać kanoniczna i ogólna.',
    use: 'Z postaci ogólnej odczytaj środek $(a, b)$ i promień, uzupełniając do pełnych kwadratów.',
    example: '$x^2 + y^2 - 4x + 6y - 3 = 0 \\iff (x - 2)^2 + (y + 3)^2 = 16$: $S = (2, -3)$, $r = 4$.',
  },
  'tri-centroid': {
    about: 'Środek ciężkości – punkt przecięcia środkowych trójkąta; jego współrzędne to średnie współrzędnych wierzchołków.',
    use: 'Środkowe dzielą się w nim w stosunku $2 : 1$ licząc od wierzchołka.',
    example: '$A = (0, 0)$, $B = (6, 0)$, $C = (3, 9)$: $S = (3, 3)$.',
  },

  // 11. Stereometria
  prism: {
    about: '$P_p$ – pole podstawy, $H$ – wysokość, $P_b$ – pole powierzchni bocznej (suma pól ścian bocznych), $P_c$ – pole całkowite.',
    use: 'Dla każdego graniastosłupa: objętość to pole podstawy razy wysokość, w polu całkowitym są dwie podstawy.',
    example: 'Graniastosłup prawidłowy trójkątny o krawędzi podstawy $2$ i wysokości $5$: $P_p = \\sqrt{3}$, $V = 5\\sqrt{3}$.',
  },
  cuboid: {
    about: 'Prostopadłościan o krawędziach $a$, $b$, $c$; $d$ – przekątna bryły.',
    use: 'Objętość, pole i przekątna; w zadaniach z kątami szukaj trójkątów prostokątnych z przekątną.',
    example: '$a = 2$, $b = 3$, $c = 6$: $V = 36$, $P_c = 2(6 + 18 + 12) = 72$, $d = \\sqrt{49} = 7$.',
  },
  cube: {
    about: 'Sześcian o krawędzi $a$; $d$ – przekątna sześcianu (przekątna ściany to $a\\sqrt{2}$).',
    use: 'Nie myl przekątnej sześcianu z przekątną ściany.',
    example: '$a = 3$: $V = 27$, $P_c = 54$, $d = 3\\sqrt{3}$.',
  },
  pyramid: {
    about: 'Ostrosłup: $P_p$ – pole podstawy, $H$ – wysokość, $P_b$ – suma pól ścian bocznych.',
    use: 'Objętość to jedna trzecia objętości graniastosłupa o tej samej podstawie i wysokości. Wysokość licz z trójkątów prostokątnych w bryle.',
    example: 'Ostrosłup prawidłowy czworokątny, krawędź podstawy $6$, $H = 4$: $V = \\frac{1}{3} \\cdot 36 \\cdot 4 = 48$.',
  },
  cylinder: {
    about: 'Walec o promieniu podstawy $r$ i wysokości $H$; powierzchnia boczna po rozwinięciu to prostokąt $2\\pi r \\times H$.',
    use: 'Objętość, pole powierzchni, przekrój osiowy (prostokąt $2r \\times H$).',
    example: '$r = 3$, $H = 5$: $V = 45\\pi$, $P_c = 2\\pi \\cdot 3 \\cdot 8 = 48\\pi$.',
  },
  cone: {
    about: 'Stożek: $r$ – promień podstawy, $H$ – wysokość, $l$ – tworząca, przy czym $l^2 = r^2 + H^2$.',
    use: 'Często najpierw trzeba policzyć $l$ lub $H$ z twierdzenia Pitagorasa. Przekrój osiowy to trójkąt równoramienny.',
    example: '$r = 3$, $H = 4$: $l = 5$, $V = \\frac{1}{3} \\cdot 9\\pi \\cdot 4 = 12\\pi$, $P_c = 3\\pi(3 + 5) = 24\\pi$.',
  },
  sphere: {
    about: 'Kula o promieniu $R$: objętość i pole powierzchni (sfery).',
    use: 'Kule wpisane i opisane na bryłach, przetapianie brył (równość objętości).',
    example: '$R = 3$: $V = \\frac{4}{3}\\pi \\cdot 27 = 36\\pi$, $P = 36\\pi$.',
  },
  tetra: {
    about: 'Czworościan foremny – wszystkie $6$ krawędzi ma długość $a$, a wszystkie ściany są trójkątami równobocznymi.',
    use: 'Spodek wysokości to środek ściany-podstawy; korzystaj ze wzorów dla trójkąta równobocznego.',
    example: '$a = 6$: $H = 2\\sqrt{6}$, $V = \\frac{216\\sqrt{2}}{12} = 18\\sqrt{2}$, $P_c = 36\\sqrt{3}$.',
  },

  // 12. Kombinatoryka
  perm: {
    about: 'Permutacje – liczba wszystkich ustawień $n$ różnych elementów w ciąg (kolejność ma znaczenie, każdy element występuje raz).',
    use: 'Ustawianie osób w kolejce, układanie liter, kolejność startu.',
    example: '$5$ osób można ustawić w kolejce na $5! = 120$ sposobów.',
  },
  var: {
    about: 'Wariacje bez powtórzeń – liczba ciągów $k$ różnych elementów wybranych z $n$ (kolejność ma znaczenie).',
    use: 'Przydział miejsc na podium, kody z niepowtarzających się cyfr.',
    example: 'Podium (złoto, srebro, brąz) spośród $10$ zawodników: $10 \\cdot 9 \\cdot 8 = 720$.',
  },
  'var-rep': {
    about: 'Wariacje z powtórzeniami – liczba ciągów długości $k$ z $n$ elementów, gdy elementy mogą się powtarzać.',
    use: 'Kody PIN, rzuty kostką, ciągi zero-jedynkowe.',
    example: 'Kodów PIN z $4$ cyfr jest $10^4 = 10\\,000$.',
  },
  'comb-k': {
    about: 'Kombinacje – liczba $k$-elementowych podzbiorów zbioru $n$-elementowego (kolejność nie ma znaczenia).',
    use: 'Wybór delegacji, losowanie kul, układy kart. Gdy kolejność jest istotna – wariacje.',
    example: 'Wybór $3$ osób z $10$: $\\binom{10}{3} = 120$.',
  },
  'rule-mult': {
    about: 'Reguła mnożenia: gdy wybór składa się z $k$ etapów i w $i$-tym etapie jest $n_i$ możliwości, wszystkich wyników jest $n_1 \\cdot n_2 \\cdot \\ldots \\cdot n_k$.',
    use: 'Podstawowe narzędzie zadań „ile jest liczb / zestawów…”. Uważaj na ograniczenia, np. pierwsza cyfra liczby nie może być zerem.',
    example: 'Liczb trzycyfrowych o cyfrach nieparzystych: $5 \\cdot 5 \\cdot 5 = 125$.',
  },

  // 13. Prawdopodobieństwo
  classic: {
    about: 'Klasyczna definicja: liczba zdarzeń sprzyjających podzielona przez liczbę wszystkich zdarzeń elementarnych (gdy są jednakowo prawdopodobne).',
    use: 'Najpierw opisz $\\Omega$ i policz $|\\Omega|$, potem policz $|A|$ tą samą metodą (z kolejnością albo bez).',
    example: 'Rzut dwiema kostkami, suma oczek $7$: $|\\Omega| = 36$, $|A| = 6$, $P(A) = \\frac{1}{6}$.',
  },
  'prob-prop': {
    about: 'Podstawowe własności: prawdopodobieństwo leży w przedziale $\\langle 0, 1 \\rangle$; $A\'$ to zdarzenie przeciwne; wzór na sumę zdarzeń.',
    use: 'Gdy łatwiej policzyć zdarzenie przeciwne („co najmniej jeden” → „żaden”), użyj $P(A) = 1 - P(A\')$.',
    example: 'Trzy rzuty monetą, co najmniej jeden orzeł: $P = 1 - \\frac{1}{8} = \\frac{7}{8}$.',
  },
  cond: {
    about: 'Prawdopodobieństwo zdarzenia $A$ pod warunkiem, że zaszło zdarzenie $B$.',
    use: 'Zadania z informacją „wiadomo, że…”. Zdarzenia są niezależne, gdy $P(A \\cap B) = P(A) \\cdot P(B)$.',
    example: 'Rzut kostką, wypadła liczba parzysta; szansa, że to $6$: $P = \\frac{1/6}{1/2} = \\frac{1}{3}$.',
  },
  total: {
    about: 'Wzór na prawdopodobieństwo całkowite: $B_1, \\ldots, B_n$ to rozłączne zdarzenia dające razem $\\Omega$ (np. wybór urny).',
    use: 'Doświadczenia dwuetapowe – sumujemy po wszystkich „gałęziach” drzewka.',
    example: 'Urna I: $3$ białe z $5$, urna II: $1$ biała z $4$, wybór urny monetą: $P = \\frac{1}{2} \\cdot \\frac{3}{5} + \\frac{1}{2} \\cdot \\frac{1}{4} = \\frac{17}{40}$.',
  },
  bernoulli: {
    about: 'Prawdopodobieństwo dokładnie $k$ sukcesów w $n$ niezależnych próbach, gdy w każdej sukces ma prawdopodobieństwo $p$.',
    use: 'Wielokrotne rzuty, strzały, testy. „Co najmniej $k$ sukcesów” to suma kilku takich składników.',
    example: 'Dokładnie $2$ szóstki w $3$ rzutach kostką: $\\binom{3}{2} \\left(\\frac{1}{6}\\right)^2 \\cdot \\frac{5}{6} = \\frac{15}{216} = \\frac{5}{72}$.',
  },

  // 14. Statystyka
  mean: {
    about: 'Średnia arytmetyczna – suma wszystkich danych podzielona przez ich liczbę.',
    use: 'Typowe zadanie: brakująca ocena przy znanej średniej – policz wymaganą sumę.',
    example: 'Oceny $4, 5, 3, 4$: $\\bar{x} = \\frac{16}{4} = 4$.',
  },
  wmean: {
    about: 'Średnia ważona – dane mają różne wagi $w_i$ (np. liczby wystąpień, punkty ECTS, wagi ocen).',
    use: 'Średnia z tabeli liczebności i średnia ocen z różnymi wagami.',
    example: 'Ocena $5$ z wagą $3$ i ocena $2$ z wagą $1$: $\\bar{x} = \\frac{15 + 2}{4} = 4{,}25$.',
  },
  gmean: {
    about: 'Średnia geometryczna $n$ liczb nieujemnych – pierwiastek $n$-tego stopnia z ich iloczynu.',
    use: 'Średnie tempo wzrostu (np. procentowego) w kolejnych okresach.',
    example: 'Średnia geometryczna liczb $2$ i $8$: $\\sqrt{16} = 4$.',
  },
  median: {
    about: 'Mediana – wartość środkowa danych uporządkowanych niemalejąco; dla parzystej liczby danych – średnia dwóch środkowych.',
    use: 'Zawsze najpierw uporządkuj dane! Mediana jest mniej wrażliwa na wartości skrajne niż średnia.',
    example: 'Dane $7, 1, 3, 9$ → $1, 3, 7, 9$: $M = \\frac{3 + 7}{2} = 5$.',
  },
  variance: {
    about: 'Wariancja – średnia kwadratów odchyleń danych od średniej arytmetycznej; mierzy rozrzut danych.',
    use: 'Drugi wzór (średnia kwadratów minus kwadrat średniej) bywa szybszy przy liczeniu.',
    example: 'Dane $2, 4, 6$: $\\bar{x} = 4$, $\\sigma^2 = \\frac{4 + 0 + 4}{3} = \\frac{8}{3}$.',
  },
  stddev: {
    about: 'Odchylenie standardowe to pierwiastek z wariancji – ma tę samą jednostkę co dane.',
    use: 'Porównywanie rozrzutu wyników; im mniejsze $\\sigma$, tym wyniki bliższe średniej.',
    example: 'Dane $2, 4, 6$: $\\sigma = \\sqrt{\\frac{8}{3}} = \\frac{2\\sqrt{6}}{3} \\approx 1{,}63$.',
  },

  // 15. Granice i pochodne
  'lim-ops': {
    about: 'Granica sumy, różnicy, iloczynu i ilorazu ciągów zbieżnych (o granicach $a$ i $b$) jest odpowiednio sumą, różnicą, iloczynem i ilorazem granic.',
    use: 'W ilorazach wielomianów podziel licznik i mianownik przez najwyższą potęgę $n$, a potem skorzystaj z $\\lim \\frac{1}{n} = 0$.',
    example: '$\\lim \\frac{3n^2 + 1}{n^2 - 2} = \\lim \\frac{3 + \\frac{1}{n^2}}{1 - \\frac{2}{n^2}} = 3$.',
  },
  'lim-e': {
    about: 'Liczba Eulera $e \\approx 2{,}718$ to granica ciągu $\\left(1 + \\frac{1}{n}\\right)^n$ – podstawa logarytmu naturalnego.',
    use: 'Granice typu „jeden do nieskończoności”: sprowadzaj wyrażenie do postaci $\\left(1 + \\frac{1}{m}\\right)^m$.',
    example: '$\\lim \\left(1 + \\frac{1}{n}\\right)^{2n} = \\left(\\lim \\left(1 + \\frac{1}{n}\\right)^n\\right)^2 = e^2$.',
  },
  'deriv-def': {
    about: 'Pochodna w punkcie $x_0$ to granica ilorazu różnicowego – współczynnik kierunkowy stycznej do wykresu w tym punkcie.',
    use: 'Na maturze zwykle liczysz pochodne ze wzorów; definicji używa się przy dowodach i w zadaniach „z definicji”.',
    example: '$f(x) = x^2$: $\\frac{(x_0 + h)^2 - x_0^2}{h} = 2x_0 + h \\to 2x_0$, więc $f\'(x_0) = 2x_0$.',
  },
  'deriv-ops': {
    about: 'Reguły różniczkowania sumy, iloczynu przez stałą, iloczynu i ilorazu funkcji.',
    use: 'Pochodne wielomianów i funkcji wymiernych. W ilorazie pilnuj kolejności w liczniku: $f\'g - fg\'$.',
    example: '$\\left(\\frac{x}{x + 1}\\right)\' = \\frac{1 \\cdot (x + 1) - x \\cdot 1}{(x + 1)^2} = \\frac{1}{(x + 1)^2}$.',
  },
  'deriv-chain': {
    about: 'Pochodna funkcji złożonej: pochodna funkcji zewnętrznej (w punkcie $f(x)$) razy pochodna funkcji wewnętrznej.',
    use: 'Pierwiastki z wyrażeń, potęgi nawiasów, funkcje trygonometryczne złożone.',
    example: '$\\left(\\sqrt{x^2 + 1}\\right)\' = \\frac{1}{2\\sqrt{x^2 + 1}} \\cdot 2x = \\frac{x}{\\sqrt{x^2 + 1}}$.',
  },
  'deriv-basic': {
    about: 'Pochodne podstawowych funkcji: potęgowej, pierwiastka i funkcji trygonometrycznych.',
    use: 'Badanie monotoniczności i ekstremów: pochodna dodatnia – funkcja rośnie, ujemna – maleje; ekstremum tam, gdzie $f\'$ zmienia znak.',
    example: '$f(x) = x^3 - 3x$: $f\'(x) = 3x^2 - 3 = 0$ dla $x = \\pm 1$ – maksimum w $-1$, minimum w $1$.',
  },
  tangent: {
    about: 'Styczna do wykresu $f$ w punkcie $(x_0, f(x_0))$ ma współczynnik kierunkowy równy $f\'(x_0)$.',
    use: 'Policz $f(x_0)$ i $f\'(x_0)$, a następnie podstaw do wzoru. Gdy dany jest kierunek stycznej, rozwiąż $f\'(x_0) = a$.',
    example: '$f(x) = x^2$, $x_0 = 1$: $f(1) = 1$, $f\'(1) = 2$, styczna $y = 2(x - 1) + 1 = 2x - 1$.',
  },

  // 16. Tablice
  'trig-table-1': {
    about: 'Przybliżone (do 4 miejsc po przecinku) wartości sinusa, cosinusa i tangensa dla kątów od $0^\\circ$ do $30^\\circ$, tak jak w tablicach CKE.',
    use: 'Odczytaj wartość w wierszu danego kąta. Odwrotnie: znając wartość funkcji, znajdź najbliższą liczbę w kolumnie i odczytaj kąt.',
    example: '$\\sin 12^\\circ \\approx 0{,}2079$. Gdy $\\tg \\alpha = 0{,}3$, najbliżej jest $\\tg 17^\\circ \\approx 0{,}3057$, więc $\\alpha \\approx 17^\\circ$.',
  },
  'trig-table-2': {
    about: 'Przybliżone wartości sin, cos i tg dla kątów od $31^\\circ$ do $60^\\circ$.',
    use: 'Obliczenia w trójkątach, gdy kąt nie jest „ładny”. Wynik zaokrąglaj tak, jak każe treść zadania.',
    example: 'Drabina o długości $5$ m oparta pod kątem $50^\\circ$ do ziemi sięga na wysokość $5 \\sin 50^\\circ \\approx 5 \\cdot 0{,}7660 \\approx 3{,}83$ m.',
  },
  'trig-table-3': {
    about: 'Przybliżone wartości sin, cos i tg dla kątów od $61^\\circ$ do $90^\\circ$; $\\tg 90^\\circ$ nie istnieje.',
    use: 'Dla kątów rozwartych skorzystaj ze wzorów redukcyjnych: $\\sin(180^\\circ - \\alpha) = \\sin \\alpha$, $\\cos(180^\\circ - \\alpha) = -\\cos \\alpha$.',
    example: '$\\cos 72^\\circ \\approx 0{,}3090$, a $\\cos 108^\\circ = -\\cos 72^\\circ \\approx -0{,}3090$.',
  },
};
