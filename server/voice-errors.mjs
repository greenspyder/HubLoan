import {AppError} from './domain.mjs';
const definitions={
 VOICE_PROVIDER_NOT_CONFIGURED:[409,'Configure e consulte a conexão do provedor em Studio avançado.'],
 VOICE_MODEL_UNAVAILABLE:[409,'O modelo ou seus arquivos não estão disponíveis neste servidor. Escolha um provedor configurado.'],
 VOICE_SYNTHESIS_TIMEOUT:[504,'A síntese excedeu o prazo. Confira o provedor antes de repetir uma operação paga.'],
 VOICE_PROVIDER_RATE_LIMIT:[429,'O provedor limitou as solicitações. Aguarde antes de tentar novamente.'],
 VOICE_QUOTA_EXCEEDED:[402,'A cota vocal está esgotada ou não pôde ser verificada. Consulte o consumo.'],
 VOICE_SYNTHESIS_BUSY:[409,'Já existe uma síntese em andamento. Aguarde sua conclusão.'],
 VOICE_AUTH_FAILED:[401,'A credencial do provedor foi recusada. Atualize a conexão do servidor.'],
 VOICE_BUDGET_REQUIRED:[409,'Autorize um limite de consumo para esta finalidade no Voice Studio.'],
 VOICE_BUDGET_EXCEEDED:[409,'O limite vocal autorizado foi atingido. Revise o consumo antes de ampliar.'],
 VOICE_RESULT_UNCERTAIN:[409,'O resultado do envio é incerto. Consulte o provedor; não repetiremos a cobrança automaticamente.'],
 VOICE_CANCELLED:[409,'A fala foi cancelada.'],
 VOICE_TECHNICAL_UNAVAILABLE:[503,'O fallback técnico também está indisponível. Instale eSpeak NG no worker; música e gameplay podem continuar sem fala.'],
 VOICE_SYNTHESIS_FAILED:[502,'O provedor não concluiu uma síntese válida. Consulte o diagnóstico técnico.']};
export class VoiceError extends AppError{constructor(code){const [status,action]=definitions[code]||definitions.VOICE_SYNTHESIS_FAILED;super(action,status);this.code=definitions[code]?code:'VOICE_SYNTHESIS_FAILED';this.action=action;}}
export function voiceError(error){if(error instanceof VoiceError)return error;const code=error?.code||'';if(definitions[code])return new VoiceError(code);const message=String(error?.message||'');return new VoiceError(({PROVIDER_AUTH_FAILED:'VOICE_AUTH_FAILED',PROVIDER_NOT_CONNECTED:'VOICE_PROVIDER_NOT_CONFIGURED',PROVIDER_RATE_LIMIT:'VOICE_PROVIDER_RATE_LIMIT',PROVIDER_QUOTA_EXCEEDED:'VOICE_QUOTA_EXCEEDED',PROVIDER_RESULT_UNCERTAIN:'VOICE_RESULT_UNCERTAIN',PROVIDER_TIMEOUT:'VOICE_SYNTHESIS_TIMEOUT'})[code]||(/timeout/i.test(message)?'VOICE_SYNTHESIS_TIMEOUT':/ocupado/i.test(message)?'VOICE_SYNTHESIS_BUSY':/cancel/i.test(message)?'VOICE_CANCELLED':/Configure HUBLOAN|model.*unavailable/i.test(message)?'VOICE_MODEL_UNAVAILABLE':'VOICE_SYNTHESIS_FAILED'));}
