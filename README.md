# Procesverslag
Markdown is een simpele manier om HTML te schrijven.  
Markdown cheat cheet: [Hulp bij het schrijven van Markdown](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet).

Nb. De standaardstructuur en de spartaanse opmaak van de README.md zijn helemaal prima. Het gaat om de inhoud van je procesverslag. Besteedt de tijd voor pracht en praal aan je website.

Nb. Door *open* toe te voegen aan een *details* element kun je deze standaard open zetten. Fijn om dat steeds voor de relevante stuk(ken) te doen.





## Jij

<details open>
  <summary>uitwerken voor kick-off werkgroep</summary>

  ### Auteur:
  Betoel Fadallah

  #### Je startniveau:
  Blauw/ rood (kon kiezen uit zwart, rood óf blauw)

  #### Je focus:
  Responsive ivm horizontale scroll. (kies uit responsive óf surface plane)
 
</details>





## Je website

<details open>
  <summary>uitwerken voor kick-off werkgroep</summary>

  ### Je opdracht:
  Dit is de site die ik ga namaken: https://www.vangoghmuseum.nl/nl
  De Home en Shop pagina zal ik volledig uitwerken. 


  #### Screenshot(s) van de eerste pagina (small screen): 
  Van Gogh homepagina: 
  <img src="readme-images/1a_homepagina_van_gogh_museum.png" width="375px" alt="Website eerste opzichte horizontale scroll">

  <img src="readme-images/2a_homepagina_van_gogh_museum.png" width="375px" alt="Zichtbare gradient effect van horizontale scroll">

  <img src="readme-images/3a_homepagina_van_gogh_museum.png" width="375px" alt="Laaste gradient effect en einde homepage">

  #### Screenshot(s) van de tweede pagina (small screen):
  Shop pagina 
  <img src="readme-images/1b_shop_page_van_gogh_museum.png" width="375px" alt="Gehele verticale scroll pagina">
  
  De shop pagina is wel anders dan de home, Home pagina is horizontale scroll en shop pagina is verticall scrollen, vandaar dat ik de css file zal scheiden. 
 
</details>



## Toegankelijkheidstest 1/2 (week 1)

<details>
  <summary>uitwerken na test in 2<sup>e</sup> werkgroep</summary>

  ### Bevindingen
  Lijst met je bevindingen die in de test naar voren kwamen:
  - De website is wel responsive maar heeft wel een aantal zwaktes zoals op de shop pagina waar het minder goed mee schaalt.
  - Met voice over leest de site op de home wel alle linkjes op de 'heading' na van section 1 en section 3. Daarnaast leest het systeem ook andere teksten in het zelfde link wat geselecteerd. Deze teksten voegen inhoudelijk geen waarde toe en hadden niet hoeven uitgesproken te worden. Waarschijnlijk zijn de alt-teksten niet goed ingevuld.

</details>



## Breakdownschets (week 1)

<details>
  <summary>uitwerken na afloop 3<sup>e</sup> werkgroep</summary>

  ### beide pagina's: 
  <img src="readme-images/breakdownsheet_wk1.png" width="1200px" alt="Breakdownsheet">

</details>



## Voortgang 1 (week 2) - dinsdag 26/11/2023 (vervroegde voortgangsgesprek/ feedback)

<details>
  <summary>uitwerken voor 1<sup>e</sup> voortgang</summary>

  ### Stand van zaken
  hier dit ging goed & dit was lastig (neem ook screenshots op van delen van je website en code)

  <img src="readme-images/1c_voortgangsgesprek_.png" width="375px" alt="breakdown van de hele pagina before">

  ### Voorbereiding en eerste feedback
  Voor op de home pagina had ik een aantal vragen over de uitdaging van de horizontale scroll effect. Ik dacht eerst aan het begin dat het verstandig was om de scroll effect als carrousel te zien, echt vond ik het idee om de de kaartjes beter in een list te stoppen, logischer. Dus heb ik mijn vraag voorgelegd aan hem, waarna hij het volgende op antwoordde: "Om eerst de horizontale scroll effect aan te pakken kun je het volgde regel toepassen":
  
  main {
     overflow-x: scroll;
     overflow-y: hidden;
  }

  Bron: https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-x

  Eerste keer dat ik de regel had toepgepast werkte het niet, later kwam ik er achter dat het aan mijn selector lag.

  Andere vraag die ik had over de Home page scroll effect was de kleur overgang van: geel naar oranje en tenslotte naar paars. Hij gaf aan dat ik dit kon bereiken door een X aantal px aan te geven door een zogehete 'breakpoint' van de breedte van het scherm, de kleur overgang geleidelijk kan laten overzetten naar een ander kleur. Wel gaf hij aan dat ik dit beter later kon oppakken aangezien ik voor responsive ga en het  toepassen er van alleen iets is voor als ik voor een 10 wilde gaan. Het voeren van de nauwkeurige breakpoint kon bereikt worden door in javascript verder door te pakken, door de breakpoint te definieren op de pagina.

  Ik heb verder geen bron kunnen vinden hoe dit bereikt kon worden, dus had ik alleen op mijn huidige gradient een timer op gezet voor bij het openen van de site, bron:
  https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_images/Using_CSS_gradients

  Samen met 2 studentassistenten Sybren Loos en Christopher Willems zijn we in de les van 26 november de 'Breakdown' opdracht gaan doornemen. We zijn de HTML structuur na gegaan of alles logisch was opgebouwd en kwamen tot een nieuwe iteratie slag. De Homepage 'main' bestaat uit 3 delen zou je kunnen zeggen: 1 (hoofd)section, 4 articles, 1 (eind)section. Na wat sparren is er besloten om de 4 articles in 1 section de doen.

  <img src="readme-images/1c_voortgangsgesprek_.png" width="375px" alt="breakdown van de hele pagina before">

  Verder gaven ze aan dat mijn breakdown er prima uitzag en keken we verder naar de opdeling van de code en hoe de site als basis verbeterd kan worden. De enige wijziging was het stoppen van alle articles in 1 section, dit veranderde uiteraard de css drastisch, dus heb ik mijn CSS selectoren zelfstandig aangepast.
  
  -----

  Dan waren we gaan kijken naar de tweede Shop pagina, Christopher en Danny vond het een goed idee dat ik de hele pagina omzet naar een Grid waarbij ik 2 kolommen aan maak voor als basis.
  
  Samen met een klasgenoot hebben we elkaars site geanalyseerd door de WCAG checklist bij na te gaan of de huidige site hier aan voldoet. Dit heb ik voor hem ook door de validator laten gaan om na te kijken of er ook andere bevindingen zijn uitgekomen. De checklist van mijn site is door Willem ingevuld, zie bijgevoegd foto's. Die van hem heeft hij ontvangen.

  <img src="readme-images/FED WCAG Checklist/CL_V1_IMG_7934.png" width="375px" alt="WCAG formulier pagina 1">
  
  <img src="readme-images/FED WCAG Checklist/CL_V1_IMG_7935.png" width="375px" alt="WCAG formulier pagina 2">

  <img src="readme-images/FED WCAG Checklist/CL_V1_IMG_7936.png" width="375px" alt="WCAG formulier pagina 3">

  <img src="readme-images/FED WCAG Checklist/CL_V1_IMG_7937.png" width="375px" alt="WCAG formulier pagina 4">

  <img src="readme-images/FED WCAG Checklist/CL_V1_IMG_7938.png" width="375px" alt="WCAG formulier pagina 5">

  <img src="readme-images/FED WCAG Checklist/CL_V1_IMG_7939.png" width="375px" alt="WCAG formulier pagina 6">

  ### Verslag van meeting, hoofdlijnen in het kort:
  hier na afloop snel de uitkomsten van de meeting vastleggen

  - Breakdown sheet besproken (navbar fix).
  - Horizontale scroll, overflow-x: scroll;
  - Gradient break is verbonden aan X aantal px, dit is alleen een bonus voor de surface plane.
  - Grid kan ik prima toepassen op mijn tweede Shop pagina in plaats van een aside. 

</details>




## Voortgang 2 (week 3) 10 december

<details>
  <summary>uitwerken voor 2<sup>e</sup> voortgang</summary>

  ### Stand van zaken
  hier dit ging goed & dit was lastig (neem ook screenshots op van delen van je website en code)

  Samen met Sybren waren we gaan kijken naar de home page en hebben we de 
  
  Van Danny kreeg ik de tip of de banner in de header te stoppen ipv de main. Deze had ik voorheen in een section gedaan in de main omdat ik dacht dat het een onderdeel daarvan moest zijn ivm met de content wat reclame gerelateerd is, dit heb ik uiteindelijk aangepast. Zo kan er over de gehele main een grid ingezet worden. 

  Daarnaast liep ik tegen de hamburgermenu aan die niet volledig vertoonde. Het leek wel te verstoppen achter de main wanneer je op de knop drukte. Ik had geprobeerd met z-index in css het probleem te verhelpen - echter lukte dit niet. Sybron en ik hadden toen kort samen gezeten en na wat experimenteren hadden we onder andere een ander element gespot met ook een z-index die een gele background colour had. Dit bleek hem uiteindelijk ook niet te zijn dus hadden we die uitgezet. Door middel van inspector hadden we wat andere regels uitgezet waardoor het uiteindelijk wel werkte, dit kwam door half afgemaakte stukken css stukken die ik weg had moeten laten.

  Van Christopher kreeg ik advies hoe ik mijn css kan opschonen en gaf hij me een extra tip over het toepassen van 'clamp' om tekst responsive maken.

  font-size: clamp(3rem, 5vw, 6rem); 

  ### Verslag van meeting
  hier na afloop snel de uitkomsten van de meeting vastleggen

  - In shop pagina moet de banner in de header ipv de main, ivm de grid voor op de hele main.
  - p
- ...

</details>





## Toegankelijkheidstest 2/2 (week 4)

<details>
  <summary>uitwerken na test in 9<sup>e</sup> werkgroep</summary>

  ### Bevindingen
  Lijst met je bevindingen die in de test naar voren kwamen (geef ook aan wat er verbeterd is):

</details>





## Voortgang 3 (week 4) donderdag 11/01/2024

<details>
  <summary>uitwerken voor 3<sup>e</sup> voortgang</summary>

  ### Stand van zaken
  hier dit ging goed & dit was lastig (neem ook screenshots op van delen van je website en code)

Donderdag 11 januari was de laatste voortgangsgesprek. Daarvoor wilde ik 

  ### Agenda voor meeting
  Vragen die ik wil stellen:
  1. Kleur overgang tijdens het horizontaal scrollen van de homepagina. Kan dit gedaan worden met css door middel van transform?
  2. Toegankelijkheid WCAG richtlijnen, welke moet ik aan houden?

  ### Verslag van meeting
  hier na afloop snel de uitkomsten van de meeting vastleggen.

  Tijdens het gesprek wilde ik graag meer te weten komen over hoe ik de kleur overgang op mijn homepagina het beste zou kunnen aanpakken. Zelf had ik transform gebruikt:
  
  transition: background-color 6s linear;

  En zo zag het er uit in mijn html 'body':
  
  body {
      padding-top: 1em;
      background-color: var(--color-background-yellow);
      transition: background-color 6s linear;
      font-family: var(--font-nunito);
      font-size: 1rem;
      line-height: 1.375;
  }

  Van Marten had ik geleerd dat ik dit het beste kon doen door de viewport van de totale width van het gehele horizontale scroll pagina, op te splitsen in drieën.

  <img src="readme-images/1c_voortgangsgesprek_.png" width="375px" alt="breakdown van de hele pagina">

  Echter weet ik niet of dit mij zal lukken binnen de deadline, dus heb ik dit open laten staan voor een mogelijke bonus.

  ________________
  Logo en search icon in de nav versus buiten nav

    <header>
      <button aria-label="Open menu">
        <img src="images/menu_icon.svg" alt=""/>
      </button>
      <nav>
        <ul>
          <li><a href="#">Home</a></li>
          <li><a href="#">Bezoek & Tickets</a></li>
          <li><a href="#">Kunst & Verhalen</a></li>
          <li><a href="#">Over</a></li>
          <li><a href="shop.html">Shop</a></li>
          <li><a href="#">NL | En</a></li>
        </ul>
      </nav>
      <a href="#"><img src="images/search_icon.svg" alt="search button"/></a>
      <a href="index.html"><img src="images/van_gogh_museum_logo.svg" alt="Van Gogh logo"/></a>
    </header>

  ______

      <header>
      <button aria-label="Open menu">
        <img src="images/menu_icon.svg" alt=""/>
      </button>
      <nav>
        <ul>
          <li><a href="#">Home</a></li>
          <li><a href="#">Bezoek & Tickets</a></li>
          <li><a href="#">Kunst & Verhalen</a></li>
          <li><a href="#">Over</a></li>
          <li><a href="shop.html">Shop</a></li>
          <li><a href="#">NL | En</a></li>
          <li>
            <a href="#"><img src="images/search_icon.svg" alt="search button"/></a>
          </li>
          <li>
            <a href="index.html"><img src="images/van_gogh_museum_logo.svg" alt="Van Gogh logo"/></a>
        </ul>
      </nav>
    </header>

  ________________
  
Tijdens de derde/ laatste feedback gesprek op donderdag 9 januari. Zijn Christopher en ik door mijn code heen gegaan en gaan kijken naar welke onderdelen ontbreken, om volledig aan de beoordelingscriteria te voldoen. Christopher gaf mij de tip om gebruik te maken van reduced motion in css voor een meer inclusievere UI oplossing. Deze functie zorgde ervoor dat mensen met een visuele beperking hun voorkeuren kunnen aangeven in de instellingen van hun laptop of computer om snelle interacties en bewegingen uit te zetten, zie onderstaande voorbeeld:

@media (prefers-reduced-motion:reduce) {
    *{
        animation: none;
        transition: none;
    }
}

Zelf werk ik toe om de responsive opdracht aan te voldoen waarbij de interface op mobile en desktop zich anders vertoont. Ik heb voor de homepage op desktop een volledige horizontale scroll op de main. Voor mobile is dit een verticale scroll. Dit was mij wel gelukt om het werkend te krijgen, echter voor mijn shop pagina was ik in twijfels of Grid en responsiveness samen gaan.  Dus dat wilde ik nog gaan aanpakken.  De desktop was wel goed behalve dan mobile nog aanpassen met @media queries. Na een gesprek met Sybren gaf hij mij de tip om de section in de main meer responsive te maken door





  Daarin had ik vermeld dat 
  - punt 2
  - nog een punt
  - ...

</details>





## Eindgesprek (week 5)

<details>
  <summary>uitwerken voor eindgesprek</summary>

  ### Je uitkomst - karakteristiek screenshots:
  <img src="readme-images/dummy-plaatje.jpg" width="375px" alt="uitkomst opdracht 1">


  ### Dit ging goed/Heb ik geleerd: 
  Korte omschrijving met plaatjes

  <img src="readme-images/dummy-plaatje.jpg" width="375px" alt="top">


  ### Dit was lastig/Is niet gelukt:
  Korte omschrijving met plaatjes

  <img src="readme-images/dummy-plaatje.jpg" width="375px" alt="bummer">
</details>





## Bronnenlijst

<details open>
  <summary>continu bijhouden terwijl je werkt</summary>

  Nb. Wees specifiek ('css-tricks' als bron is bijv. niet specifiek genoeg). 
  Nb. ChatGpT en andere AI horen er ook bij.
  Nb. Vermeld de bronnen ook in je code.

  1. bron 1
  2. bron 2
  3. ...

</details>