# Get all source files (excluding node_modules, .git, etc) and combine them
$excludedDirs = @('node_modules', '.git', 'out', 'dist', '.vscode')
$sourceFiles = @('.ts', '.js', '.json', '.md')

# Create the output file
$outputFile = "extension_code_summary.txt"

# Delete the output file if it exists
if (Test-Path $outputFile) {
    Remove-Item $outputFile
}

# Get current timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content $outputFile "VS Code Extension Code Summary - Generated $timestamp`n`n"

# Recursively get all files
Get-ChildItem -Recurse -File | 
    Where-Object { 
        $sourcePath = $_.FullName
        ($sourceFiles | ForEach-Object { $sourcePath.EndsWith($_) }) -contains $true -and
        ($excludedDirs | ForEach-Object { $sourcePath.Contains($_) }) -notcontains $true
    } | 
    ForEach-Object {
        Add-Content $outputFile "`n=== File: $($_.FullName) ===`n"
        Add-Content $outputFile (Get-Content $_.FullName -Raw)
        Add-Content $outputFile "`n`n"
    }

Write-Host "Code summary has been written to $outputFile"