/* global bodymovin, api, url, adultAlert */
const infoSecondText = document.getElementById("infoSecondText");
let lottieAnim = bodymovin.loadAnimation({
  wrapper: document.getElementById("animContainer"),
  animType: "canvas",
  loop: false,
  path: "/lottie/keep.json",
});

document.addEventListener("DOMContentLoaded", () => {
  fetch(`${api}/auth/status`, {
    method: "GET",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status == "Not authorized") {
        window.location.href = `${url}/authorize`;
      } else if (data.status == "Not registered") {
        window.location.href = `${url}/join`;
      } else if (data.status == "Not logined") {
        window.location.href = url;
      } else if (data.status == "Shutdowned") {
        window.location.href = `${api}/auth/logout?redirect=true&shutdowned=true`;
      }
    })
    .catch((error) => {
      alert(`Error occured.\n${error}`);
      console.error(`Error occured.\n${error}`);
    });
  if (Number(new URLSearchParams(window.location.search).get("adult"))) alert(adultAlert);
  setInterval(async () => {
    infoSecondText.textContent = infoSecondText.textContent - 1;
    if (infoSecondText.textContent == 0) {
      fetch(`${api}/danal/ready`, {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          let form = document.createElement("form");
          form.method = "POST";
          form.action = "https://wauth.teledit.com/Danal/WebAuth/Web/Start.php";
          form.innerHTML = `<input name="TID" value="${data.TID}">`;
          form.innerHTML += `<input name="BackURL" value="${url}/authentication/failed">`;
          form.innerHTML += `<input name="IsCharSet" value="UTF-8">`;
          document.body.append(form);
          form.submit();
        })
        .catch((error) => {
          alert(`Error occured.\n${error}`);
        });
    }
  }, 1000);
});
