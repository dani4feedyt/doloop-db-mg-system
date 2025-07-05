USE [db_1]
GO

/****** Object:  Table [dbo].[c_licenses]    Script Date: 02/07/2025 21:13:36 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[c_licenses](
	[license_id] [int] IDENTITY(1,1) NOT NULL,
	[u_id] [int] NOT NULL,
	[license_name] [varchar](max) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[license_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [dbo].[c_licenses]  WITH CHECK ADD  CONSTRAINT [FK_c_licenses_candidate_card] FOREIGN KEY([u_id])
REFERENCES [dbo].[candidate_card] ([u_id])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[c_licenses] CHECK CONSTRAINT [FK_c_licenses_candidate_card]
GO

