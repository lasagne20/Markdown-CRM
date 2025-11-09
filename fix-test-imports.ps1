# Script PowerShell pour corriger les chemins d'import dans les tests
$testPath = "src/__tests__/Properties"
$files = Get-ChildItem -Path $testPath -Filter "*.test.ts"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Corriger les imports de propriétés
    $content = $content -replace "from '\.\./\.\./\.\./\.\./Utils/Properties/", "from '../../properties/"
    $content = $content -replace "from '\.\./\.\./\.\./\.\./Classes/", "from '../../classes/"
    $content = $content -replace "from '\.\./\.\./\.\./\.\./Utils/", "from '../../vault/"
    
    # Corriger les mocks
    $content = $content -replace "jest\.mock\('\.\./\.\./Utils/App'", "jest.mock('../../vault/Utils'"
    $content = $content -replace "jest\.mock\('Utils/Modals/Modals'", "jest.mock('../../vault/Utils'"
    $content = $content -replace "jest\.mock\('Utils/", "jest.mock('../../vault/"
    $content = $content -replace "jest\.mock\('Classes/", "jest.mock('../../classes/"
    
    # Autres corrections communes
    $content = $content -replace "from 'Utils/", "from '../../vault/"
    $content = $content -replace "from 'Classes/", "from '../../classes/"
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated: $($file.Name)" -ForegroundColor Green
    } else {
        Write-Host "No changes: $($file.Name)" -ForegroundColor Gray
    }
}

Write-Host "Import paths corrected in test files" -ForegroundColor Cyan