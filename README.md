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
  - De website is niet responsief, de website is niet aangepast aan verschillende 

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

  Samen met 2 studentassistenten Sybren Loos en Christopher Willems zijn we in de les van 26 november de 'Breakdown' opdracht gaan doornemen. We zijn de Html structuur na gegaan of alles logisch was opgebouwd en kwamen tot een nieuwe iteratie slag. Namelijk de Homepage main bestaat uit 3 delen zou je kunnen zeggen: 1 (hoofd)section, 4 articles, 1 (eind)section. Na wat sparren is er besloten om de 4 articles in 1 section de doen.
  
  Met Marten heb ik het er over gehad om de dubbele navbar in de header in een hamburger menu te stoppen voor als ik de responsive opdracht wil gaan doen zodat ik aan de beoordelingseisen kan voldoen door gebruik te maken van javascript. Want op de oorspronkelijke site is er geen hamburger menu tenzij je overschakeld naar kleinere scherm, dan is de hamburger menu zichtbaar.

  <img src="readme-images/1c_voortgangsgesprek_.png" width="375px" alt="breakdown van de hele pagina before">

  Zelf twijfelde ik wat handig was over de opdeling hiervan, dus dit bracht mij tot een nieuwe inzicht. Daarnaast gaf hij aan dat mijn breakdown er prima uitzag en keken we verder naar de opdeling van de code en hoe de site als basis aangepakt kan worden. Voor op de home pagina had ik een aantal vragen over de uitdaging van de horizontale scroll effect. Ik dacht eerst aan het begin dat het verstandig was om de scroll effect als carrousel te zien, echt vond ik het idee om de de kaartjes beter in een list te stoppen, logischer. Dus heb ik mijn vraag voorgelegd aan hem, waarna hij het volgende op antwoordde: "Om eerst de horizontale scroll effect aan te pakken kun je het volgde regel toepassen":
  
  main {
     overflow-x: scroll;
     overflow-y: hidden;
  }

  Bron: https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-x

  Ik heb deze regel toepgepast in mijn code nadat ik thuis aankwam, echter is het mij niet gelukt om deze werkend te krijgen. Morgen zal ik dit opnieuw proberen.

  Andere vraag die ik had over de Home page scroll effect was de kleur overgang van: geel- oranje naar paars. Hij gaf aan dat ik dit kon doen door vanaf een X aantal px breedte van het scherm, de kleur overgang geleidelijk kan laten overzetten naar een ander kleur. Dit kon ik beter later toepassen voor als ik een 10 wilde gaan, aangezien het een lastigere uitdaging is en met javascript alleen gedaan kon worden door breakpoint te definieren op de pagina.

  Ten slotte waren we gaan kijken naar de tweede Shop pagina, Christopher en Danny vond het een goed idee dat ik de hele pagina omzet naar een Grid waarbij ik 2 kolommen aan maak voor als basis. Wat ik wel tijdens de feedback gesprek heb aangepast was de banner, deze had ik voorheen in een section gedaan in de main, wat uiteindelijk heb aangepast naar een header. Zo kan er over de algehele main een grid ingezet worden. 
  
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
  - Horizontale scroll effect= overflow-x: scroll;
  - Gradient break is verbonden aan X aantal px, dit is alleen een bonus voor de surface plane.
  - Grid kan ik prima toepassen op mijn tweede Shop pagina in plaats van een aside. 

</details>




## Voortgang 2 (week 3) 10 december

<details>
  <summary>uitwerken voor 2<sup>e</sup> voortgang</summary>

  ### Stand van zaken
  hier dit ging goed & dit was lastig (neem ook screenshots op van delen van je website en code)

  Samen met Sybren en Christopher zijn we gaan kijken naar de 


  ### Verslag van meeting
  hier na afloop snel de uitkomsten van de meeting vastleggen

  - punt 1
  - punt 2
  - nog een punt
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