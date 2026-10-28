$dst = "d:\zhuojingbiao\Week09Taku20261028\emoMusic\public\faces"
$base = "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image"
$defaultHash = "E330CD023298A812503E10A067A3F88E1CBC094F37F6FD2A88FDB6799495B37E"

# ???????? (?????/???,??????)
$candidates = @(
  "man","woman","girl","child","teenager","young man","young woman",
  "asian man","asian woman","african man","african woman","european man",
  "boy","baby","adult","senior","gentleman","lady","father","mother",
  "brother","sister","son","daughter","friend","king","queen","prince",
  "princess","doctor","teacher","student","worker","athlete","musician",
  "artist","chef","farmer","sailor","soldier","driver","singer","dancer",
  "painter","writer","neighbor","boss","cousin","uncle","aunt","husband",
  "wife","groom","bride","actor","actress","model","engineer","scientist",
  "lawyer","judge","mayor","pilot","captain","knight","warrior","hunter"
)

# 7 ???,????
$emotions = @("neutral","happy","sad","angry","fearful","disgusted","surprised")
$emoCounts = @{}
foreach ($e in $emotions) { $emoCounts[$e] = 0 }

$got = 0
$idx = 0
$seenHashes = @{}

while ($got -lt 21 -and $idx -lt $candidates.Count) {
  $prompt = "portrait of a $($candidates[$idx])"
  $enc = [System.Uri]::EscapeDataString($prompt)
  $url = "$base`?prompt=$enc&image_size=square"
  $tmp = Join-Path $env:TEMP "facegen_$idx.jpg"

  Start-Sleep -Seconds 60  # ????????

  try {
    Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing -TimeoutSec 120
    $h = (Get-FileHash $tmp).Hash
    if ($h -ne $defaultHash -and -not $seenHashes.ContainsKey($h)) {
      $seenHashes[$h] = $true
      # ???? (??,?? 3 ?)
      $emo = $emotions[$got % 7]
      $emoCounts[$emo]++
      $file = "{0}_{1}.jpg" -f $emo, $emoCounts[$emo]
      Copy-Item $tmp (Join-Path $dst $file) -Force
      $got++
      Write-Output "[$got/21] $file <= '$prompt'"
    } else {
      Write-Output "SKIP (default/dup) '$prompt'"
    }
  } catch {
    Write-Output "ERR '$prompt': $($_.Exception.Message)"
  }
  $idx++
}

Write-Output "`nDONE. Got $got/21 faces."
Get-ChildItem $dst | Sort-Object Name | Select-Object Name, Length
