# Function to convert data frame to Base64 and save to text file
convert_df_to_base64 <- function(
  df,
  csv_filename = "data.csv",
  txt_filename = "encoded_data.txt"
) {
  # Write data frame to CSV
  write.csv(df, csv_filename, row.names = FALSE)

  # Read CSV as raw binary data
  csv_raw <- readBin(
    csv_filename,
    what = "raw",
    n = file.info(csv_filename)$size
  )

  # Encode as Base64
  base64_string <- base64enc::base64encode(csv_raw)

  # Write Base64 string to text file
  writeLines(base64_string, txt_filename)

  # Return confirmation message
  return(paste("Base64-encoded CSV saved to:", txt_filename))
}

# Call function
convert_df_to_base64(data)
