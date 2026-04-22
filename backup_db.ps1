# Set database variables
$dbName = "food_delivery"
$dbUser = "postgres"
$backupFile = "food_delivery_backup_$(Get-Date -Format 'yyyyMMdd_HHmm').sql"

Write-Host "--- BACKING UP $dbName to $backupFile ---" -ForegroundColor Green

# Use pg_dump to create the backup
# Assumes pg_dump.exe is in the system PATH
& "pg_dump" -U $dbUser -d $dbName -f $backupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup Successful: $backupFile" -ForegroundColor Cyan
} else {
    Write-Host "Backup Failed! Ensure PostgreSQL bin is in your PATH." -ForegroundColor Red
}
