data <- readRDS("R/data.RDS")

compress_df_to_gzip <- function(
  df,
  csv_filename = "data.csv",
  gzip_filename = "data.csv.gz"
) {
  # Write data frame to CSV
  write.csv(df, csv_filename, row.names = FALSE)

  # Compress CSV using Gzip
  R.utils::gzip(csv_filename, destname = gzip_filename, overwrite = TRUE)

  # Return confirmation message
  return(paste("Gzipped CSV saved to:", gzip_filename))
}

# Example usage
compress_df_to_gzip(data)
