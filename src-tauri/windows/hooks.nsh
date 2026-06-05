!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr HKCU "Software\Classes\*\shell\TichPhongShare" "" "Gửi qua TichPhong Share"
  WriteRegStr HKCU "Software\Classes\*\shell\TichPhongShare" "Icon" "$INSTDIR\tich-phong-share.exe,0"
  WriteRegStr HKCU "Software\Classes\*\shell\TichPhongShare\command" "" '"$INSTDIR\tich-phong-share.exe" "%1"'

  WriteRegStr HKCU "Software\Classes\Directory\shell\TichPhongShare" "" "Gửi qua TichPhong Share"
  WriteRegStr HKCU "Software\Classes\Directory\shell\TichPhongShare" "Icon" "$INSTDIR\tich-phong-share.exe,0"
  WriteRegStr HKCU "Software\Classes\Directory\shell\TichPhongShare\command" "" '"$INSTDIR\tich-phong-share.exe" "%1"'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DeleteRegKey HKCU "Software\Classes\*\shell\TichPhongShare"
  DeleteRegKey HKCU "Software\Classes\Directory\shell\TichPhongShare"
!macroend
