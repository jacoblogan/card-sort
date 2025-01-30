import fetch from 'node-fetch';

const url = "https://mp-search-api.tcgplayer.com/v1/product/206943/listings";

const headers = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "cookie": "optimizelyEndUserId=oeu1724459013499r0.45272156125680874; tracking-preferences={%22version%22:1%2C%22destinations%22:{%22Actions%20Amplitude%22:true%2C%22AdWords%22:true%2C%22Drip%22:true%2C%22Facebook%20Pixel%22:true%2C%22Google%20AdWords%20New%22:true%2C%22Google%20Enhanced%20Conversions%22:true%2C%22Google%20Tag%20Manager%22:true%2C%22Hotjar%22:true%2C%22Impact%20Partnership%20Cloud%22:true%2C%22Optimizely%22:true}%2C%22custom%22:{%22advertising%22:true%2C%22functional%22:true%2C%22marketingAndAnalytics%22:true}}; tcg-uuid=b7f413d0-74db-4195-8d09-ae35215d4942; ajs_anonymous_id=31e25c1e-2786-4669-a105-10cd7e50b864; __ssid=2ca0d218c2bb23d0fa4e9f643c7968e; setting=CD=US&M=1; ajs_user_id=ef866fd6-3d94-4b30-9e1e-e01800be0eb1; _hjSessionUser_1917144=eyJpZCI6IjAxNjA2ZTZhLTRlYjgtNWNjNy05N2UzLWI5ZjJkNWZlOThiNCIsImNyZWF0ZWQiOjE3MjQ0NTkwNzUxNzYsImV4aXN0aW5nIjp0cnVlfQ==; _hjSessionUser_1176217=eyJpZCI6ImNkM2U3NTU3LTYxMjctNTBmZS04MmNmLTcxMDNhNDIyMTBiYSIsImNyZWF0ZWQiOjE3MjQ3MDY5NjIzODEsImV4aXN0aW5nIjp0cnVlfQ==; hubspotutk=8f651bae724c1d510465ad8f381c4928; __hs_opt_out=no; valid=set=true; _gcl_au=1.1.1725824166.1732507933.1991780600.1735967342.1735967341; _ga_XTQ57721TQ=GS1.1.1736311811.57.1.1736311826.0.0.0; product-display-settings=sort=price+shipping&size=10; _gcl_aw=GCL.1737825920.CjwKCAiAtNK8BhBBEiwA8wVt98OyzTQBGHBM4ZOCAs4jvwRcghQ1hPDLptEaq2-d6TOZsP55cr6BOhoCMIAQAvD_BwE; _gcl_gs=2.1.k1$i1737825919$u262380185; _gac_UA-620217-1=1.1737825920.CjwKCAiAtNK8BhBBEiwA8wVt98OyzTQBGHBM4ZOCAs4jvwRcghQ1hPDLptEaq2-d6TOZsP55cr6BOhoCMIAQAvD_BwE; TCG_VisitorKey=c2712340-78aa-4475-baa8-80d3abcf0ca9; __hstc=12453419.8f651bae724c1d510465ad8f381c4928.1730541021013.1737444207624.1738016152628.30; __hssrc=1; _ga_5NGPSXFK4Q=GS1.1.1738016152.37.0.1738016154.0.0.0; OAuthLoginSessionId=b2989b75-cf1f-457e-a249-5aec0aef9379; LastSeller=493583a7; __RequestVerificationToken_L2FkbWlu0=uEmCU_iZlRl8ojgbEGwyhntdgpiDTG164hnVFUWsxNZLUfl69arGFVqiq4qjeRZUttA3-k9rHMQf7PqvhHEWwRkMVMA1; _gid=GA1.2.499758895.1738016160; TCGAuthTicket_Production=69C7795E1769658049EE78087A6D42DBABB8B562CD94C458EA719D9B240E21200B2FDE6F94792694AA8025AEB4EC1A2FA5DCB332CE655C85D6DB4A807134114A05E6A5EC52F0775EF32473A071E3D55B5BD163A484B8D722A53B775CBAA0A69E6B2EB906BB3E44A0D7DABF1CD1D5AE3F3CA8160D0C9A19564F5F60684808A2F30933BC13; ASP.NET_SessionId=vaw43talgczd51zhnsbbbrxc; StoreSaveForLater_PRODUCTION=SFLK=5b656e1b2e0a432da6c0c418f7875552&Ignore=false; SellerProximity=ZipCode=&MaxSellerDistance=1000&IsActive=false; SearchSortSettings=M=1&ProductSortOption=MinPrice&ProductSortDesc=True&PriceSortOption=Shipping&ProductResultDisplay=grid; _ga_N5CWV2Q5WR=GS1.2.1738137559.106.1.1738137605.14.0.0; _ga=GA1.1.1303092341.1724459076; _hjSession_1176217=eyJpZCI6IjFjYjRjMDJkLWRhNWQtNGM0Zi1iZTc4LTk4ZWE1YjAyMjk3ZiIsImMiOjE3MzgyMTAyNDUzMTksInMiOjAsInIiOjAsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjowLCJzcCI6MH0=; analytics_session_id=1738210245744; _drip_client_4160913=vid%253D8aab183b65fb45528dfbee88bbb583a1%2526pageViews%253D150%2526sessionPageCount%253D2%2526lastVisitedAt%253D1738211322985%2526weeklySessionCount%253D52%2526lastSessionAt%253D1738210350690; _ga_VS9BE2Z3GY=GS1.1.1738210245.80.1.1738211323.58.0.0; tcg-segment-session=1738210245728%257C1738211323771; analytics_session_id.last_access=1738211323774",
    "Referer": "https://www.tcgplayer.com/",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  };

const body = JSON.stringify({
    "filters": {
      "term": {
        "sellerStatus": "Live",
        "channelId": 0,
        "language": ["English"],
        "condition": ["Near Mint"]
      },
      "range": {
        "quantity": {
          "gte": 1
        }
      },
      "exclude": {
        "channelExclusion": 0
      }
    },
    "from": 0,
    "size": 10,
    "sort": {
      "field": "price+shipping",
      "order": "asc"
    },
    "context": {
      "shippingCountry": "US",
      "cart": {}
    },
    "aggregations": ["listingType"]
  });

async function fetchData() {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.dir(data, { depth: null });
  } catch (error) {
    console.error('There was a problem with the fetch operation:', error);
  }
}

fetchData();