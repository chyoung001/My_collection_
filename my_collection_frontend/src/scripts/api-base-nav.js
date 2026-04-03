/**
 * ?apiBase= 를 페이지 이동 시 유지: URL에 있으면 sessionStorage에 저장하고,
 * 같은 탭에서 사이드바 등 내부 링크에 apiBase 쿼리를 붙인다.
 */
(function () {
  var STORAGE_KEY = "my_collection_api_base";

  function getApiBase() {
    var fromUrl = new URLSearchParams(window.location.search).get("apiBase");
    if (fromUrl) {
      try {
        sessionStorage.setItem(STORAGE_KEY, fromUrl);
      } catch (e) {}
      return fromUrl;
    }
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function patchLinks() {
    var apiBase = getApiBase();
    if (!apiBase) return;

    document.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || /^(https?:|\/\/|mailto:|tel:|#)/i.test(href)) return;
      if (href.indexOf(".html") === -1) return;
      if (/[?&]apiBase=/.test(href)) return;

      var sep = href.indexOf("?") !== -1 ? "&" : "?";
      a.setAttribute("href", href + sep + "apiBase=" + encodeURIComponent(apiBase));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", patchLinks);
  } else {
    patchLinks();
  }
})();
