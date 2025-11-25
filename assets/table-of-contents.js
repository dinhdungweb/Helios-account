var tableOfContents = function(e, t, r) {
  var n = document.querySelector(e),
      l = document.querySelector(t);
  if (n && l) {
    var a,
        i,
        o,
        c,
        h = {
          levels: "h2, h3, h4, h5, h6",
          headingLevel: "h2",
          listType: "ul"
        },
        u = {},
        p = function(e) {
          for (var t = "", r = 0; r < e; r++) t += "</" + u.listType + "></li>";
          return t
        },
        s = function(e, t) {
          return e > 0 ? function(e) {
            for (var t = "", r = 0; r < e; r++) t += "<" + u.listType + ">";
            return t
          }(e) : e < 0 ? p(Math.abs(e)) : t && !e ? "</li>" : ""
        };
    (function(e) {
      for (var t in h) Object.prototype.hasOwnProperty.call(h, t) && (u[t] = Object.prototype.hasOwnProperty.call(e, t) ? e[t] : h[t])
    })(r || {}), (a = n.querySelectorAll(u.levels)).length && (i = a[0].tagName.slice(1), o = i, c = a.length - 1, l.innerHTML = "<" + u.headingLevel + "></" + u.headingLevel + "><" + u.listType + ">" + Array.prototype.map.call(a, function(e, t) {
      ! function(e) {
        e.id.length || (e.id = "toc_" + e.textContent.replace(/[^A-Za-z0-9]/g, "-"))
      }(e);
      var r = e.tagName.slice(1),
          n = r - i;
      i = r;
      var l = s(n, t);
      return l += '<li><a href="#' + e.id + '">' + e.innerHTML.trim() + "</a>", t === c && (l += p(Math.abs(o - r))), l
    }).join("") + "</" + u.listType + ">");

    // Thêm sự kiện "click" vào phần tử kích hoạt bảng nội dung
    var triggerElement = document.querySelector(".content-toc");
    triggerElement.addEventListener("click", function() {
      l.classList.toggle("hidden");;
    });
  }
};
