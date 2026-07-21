<script lang="ts" module>
  export const SITE_CONFIG = {
    defaultDescription: "Belajar yang melekat.",
    defaultOgImage: "/icon.png",
    locale: "id_ID",
    ogType: "website",
    robots: "index, follow",
    separator: "·",
    siteName: "sinnau",
    themeColor: "#FBFBFA",
    twitterCard: "summary_large_image",
    twitterSite: "@sinnau",
  } as const;
</script>

<script lang="ts">
  import { page } from "$app/state";

  interface OGProps {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
    url?: string;
    siteName?: string;
  }

  interface TwitterProps {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
  }

  interface Props {
    title: string;
    description: string;
    og?: OGProps;
    twitter?: TwitterProps;
    canonical?: string;
    robots?: string;
    themeColor?: string;
  }

  let {
    title,
    description,
    og: ogProps = {},
    twitter: twitterProps = {},
    canonical: canonicalProp,
    robots: robotsProp,
    themeColor: themeColorProp,
  }: Props = $props();

  const canonical = $derived(canonicalProp ?? page.url.href);
  const robotsValue = $derived(robotsProp ?? SITE_CONFIG.robots);
  const themeColorValue = $derived(themeColorProp ?? SITE_CONFIG.themeColor);

  const ogTitle = $derived(ogProps.title ?? title);
  const ogDescription = $derived(ogProps.description ?? description);
  const ogUrl = $derived(ogProps.url ?? canonical);
  const ogSiteName = $derived(ogProps.siteName ?? SITE_CONFIG.siteName);
  const ogType = $derived(ogProps.type ?? SITE_CONFIG.ogType);

  const twitterCard = $derived(twitterProps.card ?? SITE_CONFIG.twitterCard);
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonical} />
  <meta name="robots" content={robotsValue} />
  <meta name="theme-color" content={themeColorValue} />

  <!-- Open Graph -->
  <meta property="og:type" content={ogType} />
  <meta property="og:title" content={ogTitle} />
  <meta property="og:description" content={ogDescription} />
  <meta property="og:url" content={ogUrl} />
  <meta property="og:site_name" content={ogSiteName} />
  <meta property="og:locale" content={SITE_CONFIG.locale} />

  {#if ogProps.image}
    <meta property="og:image" content={ogProps.image} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
  {/if}

  <!-- Twitter -->
  <meta name="twitter:card" content={twitterCard} />

  {#if twitterProps.title}
    <meta name="twitter:title" content={twitterProps.title} />
  {/if}

  {#if twitterProps.description}
    <meta name="twitter:description" content={twitterProps.description} />
  {/if}

  {#if twitterProps.image}
    <meta name="twitter:image" content={twitterProps.image} />
  {/if}

  {#if twitterProps.site}
    <meta name="twitter:site" content={twitterProps.site} />
  {/if}
</svelte:head>
