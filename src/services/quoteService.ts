import path from 'path'
import OpenAI from 'openai'
import fs from 'fs'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const sanitizeMarkdown = (text: string): string => {
  if (!text) return ''
  let cleanedText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')
  cleanedText = cleanedText.replace(/\[(.*?)\]\(.*?\)/g, '$1')
  return cleanedText
}

export const savePdf = (pdfBuffer: Buffer, userId: number, quoteTitle: string): string => {
  const sanitizedTitle = (quoteTitle || 'quote')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  const safeFilename = sanitizedTitle || 'quote'
  const pdfFilename = `${safeFilename}-${Date.now()}.pdf`
  const pdfDir = path.resolve('uploads', 'pdfs')

  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true })
  }
  const pdfPath = path.join(pdfDir, pdfFilename)
  fs.writeFileSync(pdfPath, pdfBuffer)
  console.log(`[User ${userId}] PDF saved to: ${pdfPath}`)
  return `uploads/pdfs/${pdfFilename}`
}

export const callOpenAIFordraft = async (jobDescription: string, imageFile: Express.Multer.File | undefined, userId: number) => {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are an expert proposal writer. Your task is to generate full text for a professional quote PDF.
      You MUST respond with a JSON object with four keys:
      1. "quoteTitle": A short, descriptive title for the quote based on the job description (e.g., "Basement Renovation").
      2. "pdfContent": A markdown string for the draft PDF. It MUST include the following sections with markdown headings:
         -  ### The Generated quote title.
         - "### Project Overview": Write a brief, professional summary based on the user's job description.
         - "### Scope of Work": This is the most important section of the entire quotation, 
        make sure to use only the exact phrases in this section to list out the primary jobs of the provided descripiton, and most importantly be creative with technical terms related to the job so the proposal sounds more impressive.
        To list out the primary jobs in the 'Scope of Work' section, provide ONLY the descriptive sentence or phrase. Do NOT include leading hyphens (-) or category prefixes like 'Superstructure:'.
      3. "shortMessage": A friendly message, e.g., "Draft created. Please provide the following details to finalize the quote."
      4. "requiredInputs": An array of SECTION objects. Each SECTION object MUST have two keys:
         - "label": A string for the section's title (e.g., "Bill To").
         - "fields": An array of FIELD objects. Each FIELD object MUST have three keys:
           - "name": A machine-readable, snake_case string for the form field's name (e.g., "client_name").
           - "type": A string that is one of the following: "text", "number", "date", or "textarea".
           - "placeholder": A human-readable string for the form field's placeholder text (e.g., "Enter Client Name").
           - "prefix": A string to display before the input for the currency fields ("$").
      
      RULES FOR "requiredInputs":
      **The "Bill To" section is MANDATORY. It MUST ALWAYS contain fields with the exact 'name' values: "client_name", "contact_number", and "email_address".
      **The "Quote Details" section is MANDATORY. It MUST ALWAYS contain fields for "quote_number", "quote_date", and "due_date".
      **You MUST intelligently generate additional sections like "Itemized Costs" and "Project Timeline" based on the user's job description.

      HERE IS AN EXAMPLE OF THE EXACT FORMAT TO FOLLOW FOR "requiredInputs":
      [
            {
                "label": "Bill To",
                "fields": [
                    {
                        "name": "client_name",
                        "type": "text",
                        "placeholder": "Client Name"
                    },
                    {
                        "name": "contact_number",
                        "type": "tel",
                        "placeholder": "Phone Number"
                    },
                    {
                        "name": "email_address",
                        "type": "email",
                        "placeholder": "Email address"
                    }
                ]
            },
            {
               "label": "Quote Details",
               "fields": [
                   { "name": "quote_number", "type": "text", "placeholder": "Quote Number" },
                   { "name": "quote_date", "type": "date", "placeholder": "Quote Date" },
                   { "name": "due_date", "type": "date", "placeholder": "Due Date" }
               ]
           },
            {
                "label": "Itemized Costs",
                "fields": [
                    {
                        "name": "flooring_cost",
                        "type": "number",
                        "placeholder": "Enter cost for polished concrete flooring",
                        "prefix": "$"
                    },
                    {
                        "name": "counter_construction_cost",
                        "type": "number",
                        "placeholder": "Enter cost for counter and shelving",
                        "prefix": "$"
                    },
                ]
            },
            {
                "label": "Project Timeline",
                "fields": [
                    {
                        "name": "start_date",
                        "type": "date",
                        "placeholder": "Start Date"
                    },
                    {
                        "name": "completion_date",
                        "type": "date",
                        "placeholder": "End Date"
                    }
                ]
            }
        ]`,
    },
    {
      role: 'user',
      content: [{ type: 'text', text: jobDescription }],
    },
  ]

  if (imageFile) {
    const imageBuffer = fs.readFileSync(imageFile.path)
    const base64Image = imageBuffer.toString('base64')
    ;(messages[1].content as any[]).push({
      type: 'image_url',
      image_url: { url: `data:${imageFile.mimetype};base64,${base64Image}` },
    })
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: messages,
    response_format: { type: 'json_object' },
  })

  const aiResponseString = completion.choices[0].message.content
  if (!aiResponseString) throw new Error('AI Error: The AI returned an empty response.')

  return JSON.parse(aiResponseString)
}

export const callOpenAIForFinalStream = async (
  originalDescription: string,
  finalDetails: any,
  companyProfile: any,
  userId: number,
  hasSitePhoto: boolean,
  quoteTitle: string,
  preservedScopeOfWork: string
) => {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are an expert proposal writer. Your task is to generate the full text for a professional quote PDF.
        1. IMPORTANT: The PDF header containing the company's logo and contact details will be added programmatically. Do NOT include the company's name, address, email, or phone in your response.
        2. The sections MUST be in this exact order: ### Bill To, ### Quote Details, ### Summary,  ### Quote Title, ### Scope Of Work, ### Project Timeline, ### Site Photo.
        3. You MUST use "###" for all section headings (e.g., "### Bill To", "### Site Photo", "### Scope of Work").
        4. For "### Bill To" and "### Quote Details" use the data in the "Final Details" object.
        5. Include full 'Bill To' without any leading hyphen(-).
        6. Format "Project Timeline" and "Summary" as markdown tables.
        7. In the summary section use headers "Items" and "Cost".
        8. The last row of the summary table MUST have 'Total Cost' with the accurately calculated 'Total Cost' value.
        9. For the "Scope of Work" section you MUST use the provided scope of work.
        10. Include the Scope of Work section without any leading hyphens(-).
        11. In the "Project Timeline" table, use headers "Target Kickoff" and "Anticipated Completion" and use date format to 
        Month, Day, Year - For example: September 15, 2025. 
        12. If no company profile is provided, simply OMIT the company header section. Do not mention that it's missing.
        13. Omit any sections that are not part of a final quote.
        - Do NOT include a section for "Final Details Required".`,
    },
    {
      role: 'user',
      content: `Generate the quote content using this data:
        ${companyProfile ? `- Company Profile: ${JSON.stringify(companyProfile)}` : `- Note: No company profile was provided.`}
        - A site photo has been provided by the user: ${hasSitePhoto ? 'Yes' : 'No'}
        - Summary of Job Description point-wise: "${originalDescription}"
        - Final Details (Conatins Bill To, Quote Details, Costs, Timeline): ${JSON.stringify(finalDetails)}
        - Quote Details to use: ${JSON.stringify({
          'Quote #': finalDetails.quote_number,
          'Quote date': finalDetails.quote_date,
          'Due date': finalDetails.due_date,
        })}
        - Preserved scope of work: ${preservedScopeOfWork}`,
    },
  ]

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: messages,
    stream: true,
  })

  return stream
}

export const extractScopeOfWork = (markdownContent: string): string | null => {
  if (!markdownContent) {
    return null
  }
  const scopeRegex = /(###\s*Scope of Work[\s\S]*?)(?=\n###\s*|\s*$)/i
  const match = markdownContent.match(scopeRegex)
  return match ? match[0].trim() : null
}

export const parseMarkdownSections = (content: string) => {
  const sections: { [key: string]: string[] } = {}

  content.split('\n### ').forEach((block, index) => {
    if (index === 0) {
      // Handle content before the first "###"
      const titleMatch = block.match(/^#\s*(.*)/)
      if (titleMatch) {
        sections['quote_title'] = [titleMatch[1]]
        const otherContent = block.substring(titleMatch[0].length).trim()
        if (otherContent) sections['client_information'] = otherContent.split('\n')
      } else {
        sections['client_information'] = block.trim().split('\n')
      }
    } else {
      const lines = block.split('\n')
      const header = lines.shift()?.trim() || ''
      const key = header.toLowerCase().replace(/\s+/g, '_')
      sections[key] = lines.filter((line) => line.trim())
    }
  })
  return sections
}

export const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        // Use toLocaleDateString with '2-digit' options for MM/DD/YYYY format
        return date.toLocaleDateString('en-US', {
            year: 'numeric',   // e.g., 2025
            month: '2-digit',  // e.g., 10
            day: '2-digit',    // e.g., 17
            timeZone: 'UTC',   // Prevents off-by-one day errors
        });
    } catch (e) {
        return dateString; // Fallback if the date string is invalid
    }
};


