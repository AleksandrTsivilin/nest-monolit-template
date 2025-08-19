import { plainToInstance } from 'class-transformer';
import {
  Allow,
  IsBooleanString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  Min,
  ValidateIf,
  validateSync,
} from 'class-validator';
import { Logger } from '@nestjs/common';

const logger = new Logger('env.validation');

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export enum LogLevel {
  Error = 'error',
  Warn = 'warn',
  Info = 'info',
  Debug = 'debug',
  Verbose = 'verbose',
}

class EnvironmentVariables {
  @IsNotEmpty()
  @IsEnum(Environment, {
    message: `NODE_ENV must be one of ${Object.values(Environment).join(', ')}`,
  })
  public NODE_ENV: Environment;

  @Allow()
  HOST: string;

  @Allow()
  PORT: string;

  @IsNotEmpty()
  REDIS_HOST: string;

  @Allow()
  REDIS_PORT: string;

  @IsNumber()
  @Min(1)
  THROTTLE_TTL: number;

  @IsNumber()
  @Min(1)
  THROTTLE_LIMIT: number;

  @IsEnum(LogLevel, {
    message: `LOG_LEVEL must be one of: [${Object.values(LogLevel)}]`,
  })
  LOG_LEVEL: string;

  @IsNotEmpty()
  DATABASE_TYPE: string;

  @IsNotEmpty()
  DATABASE_HOST: string;

  @Allow()
  DATABASE_PORT: string;

  @IsNotEmpty()
  DATABASE_USERNAME: string;

  @IsNotEmpty()
  DATABASE_PASSWORD: string;

  @IsNotEmpty()
  DATABASE_NAME: string;

  @IsNotEmpty()
  DATABASE_SYNCHRONIZE: string;

  @IsNotEmpty()
  DATABASE_LOGGING: string;

  @IsNotEmpty()
  DATABASE_MAX_CONNECTIONS: string;

  @IsBooleanString()
  DATABASE_SSL_ENABLED: string;

  // Optional
  @ValidateIf((o) => o.DATABASE_SSL_ENABLED === 'true')
  @IsBooleanString()
  DATABASE_REJECT_UNAUTHORIZED: string;

  @ValidateIf((o) => o.DATABASE_SSL_ENABLED === 'true')
  @IsNotEmpty()
  DATABASE_CA: string;

  @ValidateIf((o) => o.DATABASE_SSL_ENABLED === 'true')
  @IsNotEmpty()
  DATABASE_KEY: string;

  @ValidateIf((o) => o.DATABASE_SSL_ENABLED === 'true')
  @IsNotEmpty()
  DATABASE_CERT: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    logger.error(errors.toString(), {
      ...errors.map(
        (error, _index) =>
          `${Object.values(error.constraints)} | value: ${error.value}`,
      ),
    });
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
