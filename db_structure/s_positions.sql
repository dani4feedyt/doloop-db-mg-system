USE [db_1]
GO

/****** Object:  Table [dbo].[s_positions]    Script Date: 02/07/2025 21:14:10 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[s_positions](
	[pos_id] [int] NOT NULL,
	[position_name] [varchar](max) NOT NULL,
	[places_count] [int] NOT NULL,
	[places_left] [int] NOT NULL,
	[creation_date] [date] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[pos_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [dbo].[s_positions] ADD  DEFAULT ((1)) FOR [places_count]
GO

ALTER TABLE [dbo].[s_positions] ADD  DEFAULT ((0)) FOR [places_left]
GO

