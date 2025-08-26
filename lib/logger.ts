type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  userId?: string
  metadata?: Record<string, unknown>
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, userId, metadata } = entry
    let formattedMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`
    
    if (userId) {
      formattedMessage += ` (User: ${userId})`
    }
    
    if (metadata && Object.keys(metadata).length > 0) {
      formattedMessage += `\nMetadata: ${JSON.stringify(metadata, null, 2)}`
    }
    
    return formattedMessage
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>, userId?: string) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      userId,
      metadata,
    }

    const formattedMessage = this.formatMessage(entry)

    // Console logging for development
    if (this.isDevelopment) {
      switch (level) {
        case 'error':
          console.error(formattedMessage)
          break
        case 'warn':
          console.warn(formattedMessage)
          break
        case 'info':
          console.info(formattedMessage)
          break
        case 'debug':
          console.debug(formattedMessage)
          break
      }
    }

    // In production, you would send logs to a service like Sentry, LogRocket, etc.
    if (!this.isDevelopment && level === 'error') {
      // Future: Send to external logging service
      console.error(formattedMessage)
    }
  }

  info(message: string, metadata?: Record<string, unknown>, userId?: string) {
    this.log('info', message, metadata, userId)
  }

  warn(message: string, metadata?: Record<string, unknown>, userId?: string) {
    this.log('warn', message, metadata, userId)
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>, userId?: string) {
    const enrichedMetadata = {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    }
    this.log('error', message, enrichedMetadata, userId)
  }

  debug(message: string, metadata?: Record<string, unknown>, userId?: string) {
    if (this.isDevelopment) {
      this.log('debug', message, metadata, userId)
    }
  }
}

export const logger = new Logger()