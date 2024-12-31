import { SupportedFileType, FileProcessor } from '../types/fileTypes';
import { PythonProcessor } from './pythonProcessor';
import { NpmProcessor } from './npmProcessor';
import { RubyGemsProcessor } from './rubyGemsProcessor';
import { logger } from '../utils/logger';

export class ProcessorFactory {
    private static processors: Map<SupportedFileType, FileProcessor> = new Map();

    public static getProcessor(fileType: SupportedFileType): FileProcessor {
        logger.debug(`Getting processor for file type: ${fileType}`);
        let processor = this.processors.get(fileType);
        if (!processor) {
            logger.debug(`Creating new processor for ${fileType}`);
            processor = ProcessorFactory.createProcessor(fileType);
            this.processors.set(fileType, processor);
        }
        if (processor instanceof PythonProcessor) {
            processor.setFileType(fileType);
        }
        return processor;
    }

    private static createProcessor(fileType: SupportedFileType): FileProcessor {
        switch (fileType) {
            case 'requirements.txt':
            case 'pyproject.toml':
                return new PythonProcessor();
            case 'package.json':
                return new NpmProcessor();
            case 'Gemfile':
                return new RubyGemsProcessor();
        }
    }
}
