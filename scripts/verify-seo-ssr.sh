#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4101}"
product="/produit/pakarms-22-caliber-pistol-4010"

fetch() {
  local path="$1"
  curl -sS -D /tmp/gmp-seo-headers -o /tmp/gmp-seo-body "${BASE}${path}"
  awk 'NR==1 { print $2 }' /tmp/gmp-seo-headers
}

assert_contains() {
  local needle="$1"
  grep -Fq "$needle" /tmp/gmp-seo-body || { echo "Contenu absent : $needle" >&2; exit 1; }
}

assert_body_contains() {
  local needle="$1"
  perl -0777 -ne 'if (m{<div id="root">(.*?)</div>\s*<script}si) { print $1 }' /tmp/gmp-seo-body | grep -Fq "$needle" || { echo "Contenu SSR absent du body : $needle" >&2; exit 1; }
}

assert_public() {
  local path="$1" needle="$2"
  [[ "$(fetch "$path")" == "200" ]] || { echo "Statut public inattendu : $path" >&2; exit 1; }
  assert_contains '<link rel="canonical"'
  assert_contains '<meta property="og:title"'
  assert_contains '<meta name="twitter:title"'
  assert_contains 'application/ld+json'
  assert_body_contains "$needle"
  echo "OK public : $path"
}

assert_private() {
  local path="$1"
  [[ "$(fetch "$path")" == "200" ]] || { echo "Statut privé inattendu : $path" >&2; exit 1; }
  assert_contains 'name="robots" content="noindex, follow"'
  echo "OK noindex : $path"
}

assert_public / "Pistolets semi-automatiques"
assert_public /catalogue "Toutes les"
assert_public /categorie/handguns "Armes de poing"
assert_public /categorie/rifles "Carabines"
assert_public /categorie/shotguns "Fusils"
assert_public /categorie/accessories "Accessoires"
assert_public "$product" ".22 Caliber Pocket Size Mini Compact Pistol A+ Copy"
assert_public /a-propos "GunsMasterPro"
assert_public /comparateur "GunsMasterPro"
assert_public /conseiller "GunsMasterPro"
assert_public /aide "GunsMasterPro"
assert_public /confidentialite "GunsMasterPro"
assert_public /mentions-legales "GunsMasterPro"
assert_public /conditions "GunsMasterPro"
assert_public /conformite "GunsMasterPro"

[[ "$(fetch /produit/reference-inexistante)" == "404" ]] || { echo "La fiche inexistante doit répondre 404" >&2; exit 1; }
assert_contains 'name="robots" content="noindex, follow"'
echo "OK 404"

assert_private /panier
assert_private /favoris
assert_private /suivi
assert_private /administration

[[ "$(fetch /robots.txt)" == "200" ]] && assert_contains "Sitemap:"
[[ "$(fetch /sitemap.xml)" == "200" ]] && assert_contains "${product}"
echo "Validation SEO SSR réussie"
