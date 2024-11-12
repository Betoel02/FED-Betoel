
var openButton = document.querySelector("header > button");
var imgButton = document.querySelector("header > button img");
// afbeelding koppelen aan ("header > button img")

// stap 2: laat de menu-button luisteren naar kliks en voer dan een functie uit
openButton.onclick = openMenu;

// stap 3: voeg in de functie een class toe aan de nav
function openMenu() {  
    console.log("hi")
  // zoek de nav op
  var deNav = document.querySelector("nav ul:nth-of-type(1)");
  // voeg class toe aan nav
  deNav.classList.toggle("toonMenu");

  if (deNav.classList.contains("toonMenu")){
    imgButton.src= "../images/close_icon.svg";
  }

  else {
    imgButton.src= "../images/menu_icon.svg";
  }
}



// /**********************************/
// /* bonus: menu sluiten met escape */
// /**********************************/
// window.onkeydown = handleKeydown;

// function handleKeydown(event) {
//   if (event.key == "Escape") {
//     var deNav = document.querySelector("nav");
//     deNav.classList.remove("toonMenu");
//   }
// }