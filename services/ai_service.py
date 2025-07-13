# services/ai_service.py
import os
import aisuite as ai 
from dotenv import load_dotenv
from flask import current_app

load_dotenv()

try:
    ai_client = ai.Client()
except Exception as e:
    print(f"CRITICAL ERROR: Failed to initialize AISuite Client: {e}")
    ai_client = None 

def generate_content_with_groq(user_prompt, temperature_val, 
                                  mbti_type_val=None, 
                                  quiz_type_val=None,
                                  model_name="groq:llama3-8b-8192", 
                                  max_tokens_value=200): # Default token limit for Groq/others
    
    if not ai_client:
        error_message = "AISuite client is not initialized. Cannot process AI request."
        if current_app: current_app.logger.error(error_message)
        else: print(f"ERROR: {error_message}")
        raise RuntimeError(error_message)

    system_segments = ["You are a helpful assistant that writes creative short emails."]
    if quiz_type_val:
        system_segments.append(f"The email is related to the '{quiz_type_val}'.")
    if mbti_type_val:
         system_segments.append(f"The recipient has an MBTI personality type of {mbti_type_val}, so consider this in the tone and style of the email body.")
    system_content = " ".join(system_segments)
    
    messages = [{"role": "system", "content": system_content}, {"role": "user", "content": user_prompt}]

    completion_params = {
        "model": model_name,
        "messages": messages,
    }

    provider_prefix = ""
    actual_model_id_part = model_name 
    if model_name and ":" in model_name:
        parts = model_name.split(":", 1)
        provider_prefix = parts[0].lower()
        if len(parts) > 1:
            actual_model_id_part = parts[1]
    
    effective_max_tokens_for_generation = max_tokens_value 
    if provider_prefix == "openai":
        effective_max_tokens_for_generation = 1000 
        if current_app: 
            current_app.logger.info(f"OpenAI provider: effective_max_tokens set to {effective_max_tokens_for_generation} for {model_name}")
    
    if actual_model_id_part == "o4-mini-2025-04-16": # Model specific temperature handling
        if current_app: current_app.logger.info(f"Model {model_name} using API default temperature.")
        # Omitting temperature parameter for this model
    else:
        completion_params["temperature"] = temperature_val

    # Handle Max Tokens Parameter based on model/provider
    if actual_model_id_part == "o4-mini-2025-04-16": # This specific model ID expects max_completion_tokens
        completion_params["max_completion_tokens"] = effective_max_tokens_for_generation 
    elif provider_prefix == "groq":
        completion_params["max_completion_tokens"] = effective_max_tokens_for_generation 
    elif provider_prefix == "openai": 
        completion_params["max_tokens"] = effective_max_tokens_for_generation
    else: # Fallback for unknown or unprefixed models
        completion_params["max_tokens"] = effective_max_tokens_for_generation 
       
    try:
        if current_app:
            current_app.logger.info(f"AISuite Request to {model_name} - Final Params: {completion_params}")
        
        completion = ai_client.chat.completions.create(**completion_params)
        
        if current_app: current_app.logger.info(f"AISuite API call successful for model {model_name}.")
        
        if completion.choices and len(completion.choices) > 0:
            choice = completion.choices[0]
            if hasattr(choice, 'message') and choice.message:
                message_content = choice.message.content
                # Log first 100 chars of content only, to avoid overly verbose logs
                if current_app: current_app.logger.info(f"Extracted content for {model_name}: '{str(message_content)[:100]}...' (Type: {type(message_content)})")
                if message_content is None:
                     if current_app: current_app.logger.warning(f"Message content is None for model {model_name}.")
                return message_content if message_content is not None else "" 
            else:
                if current_app: current_app.logger.error(f"No 'message' attr or message is None in choice for {model_name}. Choice: {choice}")
                return ""
        else:
            if current_app: current_app.logger.error(f"No 'choices' in completion or choices empty for {model_name}. Completion: {str(completion)[:200]}...")
            return ""

    except Exception as e:
        log_error_message = f"Error calling AISuite with model {model_name}, params {completion_params}: {e}"
        if current_app: current_app.logger.error(log_error_message)
        else: print(f"ERROR: {log_error_message}")
        raise