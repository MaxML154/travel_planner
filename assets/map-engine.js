function escapeHTMLMap(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function buildNavLink(lat, lng, label, ua) {
      if (ua && /iPhone|iPad|iPod/.test(ua)) {
        return 'https://maps.apple.com/?ll=' + lat + ',' + lng + '&q=' + encodeURIComponent(label);
      }
      return 'geo:' + lat + ',' + lng + '?q=' + lat + ',' + lng + '(' + encodeURIComponent(label) + ')';
    }

    var GCJ_A = 6378245.0;
    var GCJ_EE = 0.00669342162296594323;

    // GCJ-02 加偏范围（算法用，比「中国大陆」更宽）
    function isInChinaBBox(lat, lng) {
      return lng >= 72.004 && lng <= 137.8347 && lat >= 0.8293 && lat <= 55.8271;
    }

    // 中国大陆：弹窗只给高德。港/澳/台与境外给 Google（OSM 瓦片始终用）。
    // 香港北界压到 22.45，避免把深圳蛇口/罗湖判成香港。
    function isMainlandChina(lat, lng) {
      if (!isInChinaBBox(lat, lng)) return false;
      if (lng >= 119.3 && lng <= 122.1 && lat >= 21.8 && lat <= 25.4) return false; // 台湾
      if (lng >= 113.82 && lng <= 114.44 && lat >= 22.13 && lat <= 22.45) return false; // 香港
      if (lng >= 113.52 && lng <= 113.63 && lat >= 22.10 && lat <= 22.22) return false; // 澳门
      return true;
    }

    function gcjTransformLat(x, y) {
      var ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
      ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
      ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
      ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320.0 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
      return ret;
    }

    function gcjTransformLng(x, y) {
      var ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
      ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
      ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
      ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
      return ret;
    }

    function gcj02ToWgs84(lat, lng) {
      if (!isInChinaBBox(lat, lng)) return { lat: lat, lng: lng };
      var dLat = gcjTransformLat(lng - 105.0, lat - 35.0);
      var dLng = gcjTransformLng(lng - 105.0, lat - 35.0);
      var radLat = lat / 180.0 * Math.PI;
      var magic = Math.sin(radLat);
      magic = 1 - GCJ_EE * magic * magic;
      var sqrtMagic = Math.sqrt(magic);
      dLat = (dLat * 180.0) / ((GCJ_A * (1 - GCJ_EE)) / (magic * sqrtMagic) * Math.PI);
      dLng = (dLng * 180.0) / (GCJ_A / sqrtMagic * Math.cos(radLat) * Math.PI);
      return { lat: lat - dLat, lng: lng - dLng };
    }

    // 大陆：高德用原始 GCJ-02 + coordinate=gaode。境外：Google 用 WGS-84。底图始终 OSM。
    function buildMapAppLinks(gcjLat, gcjLng, wgsLat, wgsLng, label) {
      if (isMainlandChina(gcjLat, gcjLng)) {
        return [{
          label: '高德地图',
          url: 'https://uri.amap.com/marker?position=' + gcjLng + ',' + gcjLat
            + '&name=' + encodeURIComponent(label)
            + '&coordinate=gaode&callnative=1&src=travel-planner',
        }];
      }
      return [{
        label: 'Google 地图',
        url: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(wgsLat + ',' + wgsLng),
      }];
    }

    function routeCoordinates(points) {
      return points.map(function (p) { return [p.lat, p.lng]; });
    }

    function initTravelMap(elementId, points, opts) {
      opts = opts || {};
      var map = L.map(elementId);
      L.tileLayer(opts.tileUrl || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: opts.attribution || '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      var ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
      var wgsPoints = [];
      points.forEach(function (p, i) {
        var t = (p.type || '').toLowerCase();
        var iconColor = (t === 'hotel') ? '#39c5bb' :
                        (t === 'dining' || t === 'meal') ? '#e3b341' :
                        (t === 'transit' || t === 'parking') ? '#768390' :
                        '#57ab5a';

        var wgs = gcj02ToWgs84(p.lat, p.lng);
        wgsPoints.push({ lat: wgs.lat, lng: wgs.lng });
        var icon = L.divIcon({
          className: 'route-pin',
          html: '<span class="route-pin__num" style="background: linear-gradient(135deg, ' + iconColor + ', ' + adjustBrightness(iconColor, 0.7) + '); color: #fff;">' + (i + 1) + '</span>',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        // OSM / geo: WGS-84；大陆高德: GCJ-02；境外 Google: WGS-84
        var navLinks = [{ label: '导航', url: buildNavLink(wgs.lat, wgs.lng, p.name, ua) }]
          .concat(buildMapAppLinks(p.lat, p.lng, wgs.lat, wgs.lng, p.name));
        L.marker([wgs.lat, wgs.lng], { icon: icon }).addTo(map).bindPopup(
          '<b>' + (i + 1) + '. ' + escapeHTMLMap(p.name) + '</b><br>'
          + (p.type ? '<span style="color: #39c5bb; font-size: 11px;">(' + escapeHTMLMap(p.type) + ')</span><br>' : '')
          + (p.time ? escapeHTMLMap(p.time) + '<br>' : '')
          + navLinks.map(function (l) {
              return '<a href="' + l.url + '">' + escapeHTMLMap(l.label) + '</a>';
            }).join(' · ')
        );
      });

      var coords = routeCoordinates(wgsPoints);
      if (coords.length > 1) {
        L.polyline(coords, { dashArray: '6 8', weight: 2, color: '#57ab5a' }).addTo(map);
      }
      map.fitBounds(coords.length ? coords : [[0, 0]], { padding: [30, 30] });
      return map;
    }

    // 辅助函数：调整颜色亮度
    function adjustBrightness(color, factor) {
      var hex = color.replace('#', '');
      var r = parseInt(hex.substr(0, 2), 16);
      var g = parseInt(hex.substr(2, 2), 16);
      var b = parseInt(hex.substr(4, 2), 16);
      r = Math.min(255, Math.floor(r * factor));
      g = Math.min(255, Math.floor(g * factor));
      b = Math.min(255, Math.floor(b * factor));
      return '#' + [r, g, b].map(function(x) {
        return ('0' + x.toString(16)).slice(-2);
      }).join('');
    }

    if (typeof module !== 'undefined' && module.exports) {
      module.exports = {
        buildNavLink: buildNavLink,
        buildMapAppLinks: buildMapAppLinks,
        routeCoordinates: routeCoordinates,
        gcj02ToWgs84: gcj02ToWgs84,
        isMainlandChina: isMainlandChina,
        initTravelMap: initTravelMap,
      };
    }
