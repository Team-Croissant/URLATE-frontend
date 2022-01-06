/*global api, projectUrl*/
document.addEventListener("DOMContentLoaded", () => {
  fetch(`${api}/auth/status`, {
    method: "GET",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status == "Logined") {
        window.location.href = `${projectUrl}/game`;
      } else if (data.status == "Not authorized") {
        window.location.href = `${projectUrl}/authorize`;
      } else if (data.status == "Not authenticated") {
        window.location.href = `${projectUrl}/authentication`;
      } else if (data.status == "Not authenticated(adult)") {
        window.location.href = `${projectUrl}/authentication?adult=1`;
      } else if (data.status == "Not logined") {
        window.location.href = projectUrl;
      } else if (data.status == "Shutdowned") {
        window.location.href = `${api}/auth/logout?redirect=true&shutdowned=true`;
      }
      if (nameReg.test(data.tempName)) {
        document.getElementById("nickname").value = data.tempName;
      }
    })
    .catch((error) => {
      alert(`Error occured.\n${error}`);
    });
});

const nameReg = /^[a-zA-Z0-9_-]{5,12}$/;
const passReg = /^[0-9]{4,6}$/;

document.getElementById("nickname").addEventListener(
  "blur",
  () => {
    requestAnimationFrame(() => {
      if (!nameReg.test(document.getElementById("nickname").value)) {
        document.getElementById("name").classList.add("show");
      } else {
        document.getElementById("name").classList.remove("show");
      }
    });
  },
  true
);

document.getElementById("password").addEventListener(
  "blur",
  () => {
    requestAnimationFrame(() => {
      if (!passReg.test(document.getElementById("password").value)) {
        document.getElementById("pw").classList.add("show");
      } else {
        document.getElementById("pw").classList.remove("show");
      }
    });
  },
  true
);

const check = () => {
  if (!nameReg.test(document.getElementById("nickname").value)) {
    document.getElementById("name").classList.add("show");
  } else {
    document.getElementById("name").classList.remove("show");
    if (!passReg.test(document.getElementById("password").value)) {
      document.getElementById("pw").classList.add("show");
    } else {
      document.getElementById("pw").classList.remove("show");
      fetch(`${api}/auth/join`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          displayName: document.getElementById("nickname").value,
          secondaryPassword: document.getElementById("password").value,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.result == "success") {
            window.location.href = `${projectUrl}/authentication`;
          } else if (data.result == "failed") {
            if (data.error == "Exist Name") {
              document.getElementById("nameExist").style.display = "initial";
              document.getElementById("nameExist").classList.add("show");
            } else {
              alert("join failed.");
              console.log(data);
            }
          }
        })
        .catch((error) => {
          alert(`Error occured.\n${error}`);
        });
    }
  }
};

document.addEventListener("keydown", (event) => {
  if (event.code == "Enter") {
    check();
  }
});
